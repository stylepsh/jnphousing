"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  const [open, setOpen] = useState(false);
  const [sheetId, setSheetId] = useState(sheets[0]?.id ?? "");
  const [fillRest, setFillRest] = useState(true); // 나머지 자동 거주
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
    if (fillRest && !sheetId) {
      toast.error("‘나머지 자동 거주’는 어느 답사지(발급)인지 먼저 고르세요.");
      return;
    }
    if (vacant.length === 0 && occupied.length === 0 && !fillRest) {
      toast.error("공실 또는 거주 번호를 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await bulkSurveyByNumber({
        sheet_id: sheetId || undefined,
        vacant,
        occupied: fillRest ? [] : occupied,
        fill_rest: fillRest,
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
        toast.warning(
          `${fillRest ? "이 발급에 없는" : "존재하지 않는"} 물건번호: ${res.unmatched.join(", ")}`,
          { duration: 8000 },
        );
      }
      setVacantText("");
      setOccupiedText("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-2.5 text-left hover:bg-muted/40"
      >
        <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
          <ListChecks className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-sm text-slate-700">번호 일괄입력 <span className="text-[10px] font-bold text-slate-400 align-middle">백업</span></span>
          <span className="block text-[11px] text-muted-foreground">
            종이(PDF)로 받았거나 일부만 손볼 때 — 물건번호로 공실/거주를 한 번에
          </span>
        </span>
        <span className="ml-auto text-xs font-bold text-muted-foreground">{open ? "닫기" : "열기"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t bg-card pt-4">
          {/* 발급(sheet) 선택 — '나머지 자동 거주' 범위 산정용. 일반 입력은 불필요. */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
              <FileStack className="w-3.5 h-3.5" /> 어느 답사지(발급)인가요?
              <span className="font-normal text-muted-foreground/70">
                {fillRest ? "— ‘나머지 자동 거주’에 필요" : "— 선택(일반 입력은 번호만으로 처리)"}
              </span>
            </label>
            {sheets.length === 0 ? (
              <p className="text-sm text-amber-600 rounded-lg bg-amber-50 px-3 py-2">
                발급된 답사지가 없습니다. ‘나머지 자동 거주’를 쓰려면 수집 화면에서 답사지 PDF를 먼저 출력하세요.
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
                이 발급 {selectedSheet.total_count}건 · 번호는 종이에 적힌 물건번호 그대로 입력하세요(발급마다 안 바뀜).
              </p>
            )}
          </div>

          {/* 나머지 자동 거주 토글 */}
          <label className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={fillRest}
              onChange={(e) => setFillRest(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-emerald-600"
            />
            <span className="text-sm">
              <b>공실 번호만 입력 → 나머지는 전부 거주로 자동 처리</b>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                답사팀이 다 돌고 온 발급이면 켜두세요. 공실 50개만 치면 나머지 150개는 거주로 들어갑니다. (끄면 거주도 직접 입력)
              </span>
            </span>
          </label>

          <div className={cn("grid gap-3", fillRest ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
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
            {fillRest ? (
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm self-end">
                {selectedSheet ? (
                  <>
                    공실 <b className="text-emerald-700">{vacant.length}건</b> · 나머지{" "}
                    <b className="text-slate-700">{Math.max(0, selectedSheet.total_count - vacant.length)}건</b> 거주로 처리됩니다.
                  </>
                ) : (
                  <span className="text-muted-foreground">발급을 선택하면 자동 처리 건수가 표시됩니다.</span>
                )}
              </div>
            ) : (
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
            )}
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
            {fillRest
              ? "공실로 안 넣은 번호는 전부 거주로 처리됩니다. 일부만 답사됐으면 토글을 끄고 공실·거주를 각각 입력하세요."
              : "입력하지 않은 번호는 건드리지 않습니다. 같은 번호를 공실·거주 양쪽에 넣으면 오류로 막힙니다."}
          </p>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={pending || (fillRest && sheets.length === 0)} className="gap-1">
              <ListChecks className="w-4 h-4" />
              {pending ? "반영 중…" : "일괄 반영"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
