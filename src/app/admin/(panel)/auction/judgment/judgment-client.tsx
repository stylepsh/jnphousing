"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target, ChevronDown, Copy, Trash2, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  designateFullSurveyTarget,
  updateFullSurveyTarget,
  removeFullSurveyTarget,
} from "./actions";

export type Verdict = "full_survey" | "sample_thin" | "revisit" | "occupied_exists" | "none";

export interface OwnerVerdict {
  owner_name: string;
  total: number;
  vacant: number;
  occupied: number;
  revisit: number;
  pending: number;
  skip: number;
  surveyed: number;
  verdict: Verdict;
  targetStatus: string | null;
  items: { seq: number | null; address: string; case_number: string; survey_status: string }[];
}

export interface TargetRow {
  id: string;
  owner_name: string;
  status: "pending" | "collecting" | "done" | "dropped";
  reason: string | null;
  sample_total: number;
  sample_vacant: number;
  note: string | null;
  updated_at: string;
}

const VERDICT_META: Record<Verdict, { label: string; chip: string; desc: string }> = {
  full_survey: { label: "전수조사필수", chip: "bg-emerald-100 text-emerald-800 border-emerald-300", desc: "표본 전부 공실 — 운용 안 하는 임대인 의심" },
  sample_thin: { label: "공실 1건 · 표본부족", chip: "bg-amber-100 text-amber-800 border-amber-300", desc: "공실이지만 표본 1건뿐 — 추가 답사 권장" },
  revisit: { label: "재방문 필요", chip: "bg-sky-100 text-sky-800 border-sky-300", desc: "재방문 표시 — 판정 보류" },
  occupied_exists: { label: "거주중물건있음 · 제외", chip: "bg-slate-100 text-slate-600 border-slate-300", desc: "표본 중 거주 물건 존재 — 운용 중으로 보고 제외" },
  none: { label: "-", chip: "bg-slate-100 text-slate-500 border-slate-200", desc: "" },
};

const STATUS_META: Record<TargetRow["status"], { label: string; chip: string }> = {
  pending: { label: "지정됨(미수집)", chip: "bg-amber-100 text-amber-800" },
  collecting: { label: "재수집중", chip: "bg-blue-100 text-blue-800" },
  done: { label: "완료", chip: "bg-emerald-100 text-emerald-800" },
  dropped: { label: "제외", chip: "bg-slate-100 text-slate-500" },
};

const ITEM_STATUS: Record<string, { label: string; chip: string }> = {
  vacant: { label: "공실", chip: "bg-emerald-100 text-emerald-700" },
  occupied: { label: "거주", chip: "bg-rose-100 text-rose-700" },
  revisit: { label: "재방", chip: "bg-sky-100 text-sky-700" },
  pending: { label: "미답사", chip: "bg-slate-100 text-slate-500" },
  skip: { label: "스킵", chip: "bg-slate-100 text-slate-400" },
};

export function JudgmentClient({ owners, targets }: { owners: OwnerVerdict[]; targets: TargetRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const summary = useMemo(() => {
    const s = { full_survey: 0, sample_thin: 0, revisit: 0, occupied_exists: 0 };
    for (const o of owners) if (o.verdict in s) s[o.verdict as keyof typeof s]++;
    return s;
  }, [owners]);

  const activeTargets = useMemo(() => targets.filter((t) => t.status !== "dropped"), [targets]);

  function toggle(owner: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(owner)) n.delete(owner);
      else n.add(owner);
      return n;
    });
  }

  function designate(o: OwnerVerdict) {
    startTransition(async () => {
      const res = await designateFullSurveyTarget({
        owner_name: o.owner_name,
        reason: `표본 ${o.vacant}/${o.surveyed} 공실`,
        sample_total: o.surveyed,
        sample_vacant: o.vacant,
      });
      if (!res.ok) {
        toast.error(res.error ?? "지정 실패");
        return;
      }
      toast.success(`${o.owner_name} — 전수조사 대상으로 지정`);
      router.refresh();
    });
  }

  function setStatus(t: TargetRow, status: TargetRow["status"]) {
    startTransition(async () => {
      const res = await updateFullSurveyTarget({ id: t.id, status });
      if (!res.ok) {
        toast.error(res.error ?? "변경 실패");
        return;
      }
      router.refresh();
    });
  }

  function remove(t: TargetRow) {
    if (!confirm(`${t.owner_name}을(를) 전수조사 명단에서 제거할까요?`)) return;
    startTransition(async () => {
      const res = await removeFullSurveyTarget(t.id);
      if (!res.ok) {
        toast.error(res.error ?? "제거 실패");
        return;
      }
      toast.success("명단에서 제거됨");
      router.refresh();
    });
  }

  function copyOwner(name: string) {
    navigator.clipboard?.writeText(name).then(
      () => toast.success(`"${name}" 복사됨 — 수집 화면 소유주 검색창에 붙여넣으세요`),
      () => toast.error("복사 실패"),
    );
  }

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([
          ["full_survey", "전수조사필수", summary.full_survey],
          ["sample_thin", "표본부족(공실1)", summary.sample_thin],
          ["revisit", "재방문 필요", summary.revisit],
          ["occupied_exists", "거주중·제외", summary.occupied_exists],
        ] as const).map(([k, label, n]) => (
          <div key={k} className="rounded-lg border bg-card p-3">
            <div className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border", VERDICT_META[k as Verdict].chip)}>
              {label}
            </div>
            <div className="text-2xl font-black mt-1">{n}</div>
          </div>
        ))}
      </div>

      {/* 2차 worklist — 전수조사 대상 명단 */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-700" />
          <span className="font-bold text-sm">전수조사 대상 명단 (2차)</span>
          <span className="text-xs text-muted-foreground">{activeTargets.length}명</span>
          <Link href="/admin/auction/collection" className="ml-auto text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1">
            수집 화면으로 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {activeTargets.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            아직 지정된 전수조사 대상이 없습니다. 아래 판정에서 <strong className="text-emerald-700">전수조사필수</strong> 임대인을 지정하세요.
          </div>
        ) : (
          <div className="divide-y">
            {activeTargets.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className="font-bold text-sm">{t.owner_name}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STATUS_META[t.status].chip)}>
                  {STATUS_META[t.status].label}
                </span>
                {t.reason && <span className="text-xs text-muted-foreground">{t.reason}</span>}
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={() => copyOwner(t.owner_name)} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:bg-muted px-1.5 py-1 rounded" title="이름 복사 → 수집 검색">
                    <Copy className="w-3 h-3" /> 이름복사
                  </button>
                  <select
                    value={t.status}
                    onChange={(e) => setStatus(t, e.target.value as TargetRow["status"])}
                    disabled={pending}
                    className="h-7 text-xs rounded-md border bg-background px-1.5"
                  >
                    <option value="pending">지정됨(미수집)</option>
                    <option value="collecting">재수집중</option>
                    <option value="done">완료</option>
                    <option value="dropped">제외</option>
                  </select>
                  <button onClick={() => remove(t)} disabled={pending} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600" title="명단에서 제거">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 임대인별 판정 */}
      {owners.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          답사 결과가 입력된 임대인이 없습니다. 먼저 답사지 출력 → 번호 일괄입력으로 공실/거주를 반영하세요.
        </div>
      ) : (
        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/40 flex items-center gap-2">
            <span className="font-bold text-sm">임대인별 판정</span>
            <span className="text-xs text-muted-foreground">{owners.length}명 (답사 결과 있는 임대인)</span>
          </div>
          <div className="divide-y">
            {owners.map((o) => {
              const meta = VERDICT_META[o.verdict];
              const isOpen = expanded.has(o.owner_name);
              const alreadyTarget = o.targetStatus !== null;
              return (
                <div key={o.owner_name} className="px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => toggle(o.owner_name)} className="inline-flex items-center gap-1.5 min-w-0">
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                      <span className="font-bold text-sm truncate">{o.owner_name}</span>
                    </button>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold border", meta.chip)}>{meta.label}</span>
                    <span className="text-xs text-muted-foreground">
                      답사 {o.surveyed}/{o.total} · 공실 {o.vacant} · 거주 {o.occupied}
                      {o.revisit > 0 && ` · 재방 ${o.revisit}`}
                      {o.pending > 0 && ` · 미답사 ${o.pending}`}
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      {alreadyTarget ? (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STATUS_META[o.targetStatus as TargetRow["status"]]?.chip ?? "bg-slate-100 text-slate-500")}>
                          명단등록 · {STATUS_META[o.targetStatus as TargetRow["status"]]?.label ?? o.targetStatus}
                        </span>
                      ) : o.verdict === "full_survey" || o.verdict === "sample_thin" ? (
                        <Button size="sm" disabled={pending} onClick={() => designate(o)} className="gap-1 h-7">
                          <Target className="w-3.5 h-3.5" /> 전수조사 지정
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {meta.desc && !isOpen && (
                    <p className="text-[11px] text-muted-foreground mt-1 ml-6">{meta.desc}</p>
                  )}

                  {isOpen && (
                    <div className="mt-2 ml-6 rounded-lg border bg-muted/20 divide-y">
                      {o.items.map((it, i) => (
                        <div key={`${it.case_number}-${i}`} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                          {it.seq != null && <span className="font-mono font-bold text-slate-500 w-8 shrink-0">#{it.seq}</span>}
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0", ITEM_STATUS[it.survey_status]?.chip ?? "bg-slate-100 text-slate-500")}>
                            {ITEM_STATUS[it.survey_status]?.label ?? it.survey_status}
                          </span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground min-w-0">
                            <Home className="w-3 h-3 shrink-0" />
                            <span className="truncate">{it.address}</span>
                          </span>
                          <span className="font-mono text-[10px] text-blue-700 ml-auto shrink-0">{it.case_number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
