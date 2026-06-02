"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWon } from "@/lib/money";
import { updateSurveyResult } from "./survey-actions";
import { SURVEY_STATUS, type SurveyItem } from "./survey-status";

export function SurveyRow({ item }: { item: SurveyItem }) {
  const [status, setStatus] = useState(item.survey_status);
  const [surveyBy, setSurveyBy] = useState(item.survey_by ?? "");
  const [surveyDate, setSurveyDate] = useState(item.survey_date ?? "");
  const [doorCode, setDoorCode] = useState(item.door_code ?? "");
  const [memo, setMemo] = useState(item.survey_memo ?? "");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      const res = await updateSurveyResult({
        id: item.id,
        survey_status: status,
        survey_date: surveyDate || undefined,
        survey_by: surveyBy || undefined,
        door_code: doorCode || undefined,
        survey_memo: memo || undefined,
      });
      if (!res.ok) {
        toast.error(res.error ?? "저장 실패");
        return;
      }
      toast.success("답사 결과 저장됨");
      setOpen(false);
      router.refresh();
    });
  }

  const badge =
    SURVEY_STATUS.find((s) => s.value === status) ?? SURVEY_STATUS[0];

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">{item.case_number}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.color}`}>
              {badge.label}
            </span>
            {item.category && (
              <span className="text-[11px] text-muted-foreground">{item.category}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.address}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
            {item.appraisal_value != null && <span>감정 {formatWon(item.appraisal_value)}</span>}
            {item.minimum_bid != null && <span>최저 {formatWon(item.minimum_bid)}</span>}
            {item.door_code && <span>현관 {item.door_code}</span>}
            {item.survey_by && <span>답사 {item.survey_by}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "답사 입력"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">답사 상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-md border bg-background"
            >
              {SURVEY_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">답사일</label>
            <Input type="date" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">답사자</label>
            <Input value={surveyBy} onChange={(e) => setSurveyBy(e.target.value)} placeholder="담당자명" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">현관 비밀번호</label>
            <Input value={doorCode} onChange={(e) => setDoorCode(e.target.value)} placeholder="예: *1234#" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground mb-1 block">답사 메모</label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="현장 특이사항" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={handleSave} disabled={pending} className="gap-1">
              <Save className="w-4 h-4" />
              {pending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
