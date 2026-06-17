"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bulkSurveyByNumber, type OpenSheet } from "./survey-actions";

/** 텍스트에서 양의 정수만 추출 (콤마·공백·줄바꿈 아무거나 구분). */
function parseNumbers(text: string): number[] {
  const out: number[] = [];
  for (const tok of text.split(/[^0-9]+/)) {
    if (!tok) continue;
    const n = parseInt(tok, 10);
    if (Number.isInteger(n) && n > 0) out.push(n);
  }
  return out;
}

function sheetLabel(s: OpenSheet): string {
  const d = new Date(s.printed_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  const done = s.entered_count >= s.total_count && s.total_count > 0 ? " ✓완료" : s.entered_count > 0 ? ` (${s.entered_count}/${s.total_count})` : "";
  return `${d} · ${s.region_label} · ${s.total_count}건${done}`;
}

export function BulkEntry({ sheets }: { sheets: OpenSheet[] }) {
  const [open, setOpen] = useState(true);
  const [sheetId, setSheetId] = useState(sheets[0]?.id ?? "");
  const [vacantText, setVacantText] = useState("");
  const [occupiedText, setOccupiedText] = useState("");
  const [surveyBy, setSurveyBy] = useState("");
  const [surveyDate, setSurveyDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const vacant = useMemo(() => parseNumbers(vacantText), [vacantText]);
  const occupied = useMemo(() => parseNumbers(occupiedText), [occupiedText]);
  const selectedSheet = sheets.find((s) => s.id === sheetId) ?? null;

  function handleSubmit() {
    if (!sheetId) {
      toast.error("발급(답사지)을 먼저 선택하세요.");
      return;
    }
    if (vacant.length === 0 && occupied.length === 0) {
      toast.error("공실 또는 거주 번호를 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await bulkSurveyByNumber({
        sheet_id: sheetId,
        vacant,
        occupied,
        survey_by: surveyBy || undefined,
        survey_date: surveyDate || undefined,
      });
      if (!res.ok) {
        toast.error(res.error ?? "저장 실패");
        return;
      }
      const parts: string[] = [];
      if (res.vacantUpdated) parts.push(`공실 ${res.vacantUpdated}`);
      if (res.occupiedUpdated) parts.push(`거주 ${res.occupiedUpdated}`);
      toast.success(`반영 완료 — ${parts.join(" · ") || "0건"}`);
      if (res.unmatched && res.unmatched.length > 0) {
        toast.warning(`이 답사지에 없는 번호: ${res.unmatched.join(", ")}`, { duration: 8000 });
      }
      setVacantText("");
      setOccupiedText("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-2.5 text-left hover:bg-rose-50/60"
      >
        <span className="h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
          <ListChecks className="w-5 h-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-black text-base">번호 일괄입력</span>
          <span className="block text-xs text-muted-foreground">
            답사지(발급)를 고르고 종이의 번호만 보고 공실/거주를 한 번에 반영합니다
          </span>
        </span>
        <span className="ml-auto text-xs font-bold text-rose-700">{open ? "닫기" : "열기"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-rose-200 bg-card pt-4">
          {/* 발급(sheet) 선택 */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
              <FileStack className="w-3.5 h-3.5" /> 어느 답사지(발급)인가요?
            </label>
            {sheets.length === 0 ? (
              <p className="text-sm text-amber-600 rounded-lg bg-amber-50 px-3 py-2">
                발급된 답사지가 없습니다. 수집 화면에서 지역을 골라 답사지 PDF를 먼저 출력하세요.
              </p>
            ) : (
              <select
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-md border bg-background"
              >
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sheetLabel(s)}
                  </option>
                ))}
              </select>
            )}
            {selectedSheet && (
              <p className="text-[11px] text-muted-foreground mt-1">
                번호 범위 1~{selectedSheet.total_count} · 종이 답사지 제목과 같은 발급인지 확인하세요.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-emerald-700 mb-1 block">
                공실 번호 {vacant.length > 0 && <span className="text-muted-foreground">({vacant.length})</span>}
              </label>
              <Textarea
                value={vacantText}
                onChange={(e) => setVacantText(e.target.value)}
                placeholder={"공실인 번호만\n예) 3 7 12 15  또는  3,7,12,15"}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                거주 번호 {occupied.length > 0 && <span className="text-muted-foreground">({occupied.length})</span>}
              </label>
              <Textarea
                value={occupiedText}
                onChange={(e) => setOccupiedText(e.target.value)}
                placeholder={"거주(점유) 중인 번호\n비워두면 그대로 둠"}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">답사자 (선택)</label>
              <Input value={surveyBy} onChange={(e) => setSurveyBy(e.target.value)} placeholder="담당자명 — 입력 시 일괄 기록" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">답사일 (선택, 기본 오늘)</label>
              <Input type="date" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            입력하지 않은 번호는 건드리지 않습니다. 같은 번호를 공실·거주 양쪽에 넣으면 오류로 막힙니다.
          </p>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={pending || sheets.length === 0} className="gap-1">
              <ListChecks className="w-4 h-4" />
              {pending ? "반영 중…" : "일괄 반영"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
