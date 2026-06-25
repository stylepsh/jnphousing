"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { importSurveySheet, type SurveyImportResult } from "./import-actions";
import { Button } from "@/components/ui/button";

export function SurveyUpload() {
  const [res, setRes] = useState<SurveyImportResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-black text-base">답사표 엑셀 업로드</h3>
          <p className="text-xs text-muted-foreground">
            답사자가 채워 보낸 엑셀(.xlsx/.csv)을 올리면 <b>사건번호로 매칭</b>해 공실·거주·재방문을 한 번에 반영합니다.
          </p>
        </div>
      </div>

      <form
        action={(fd) => start(async () => setRes(await importSurveySheet(fd)))}
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5"
      >
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx"
          required
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-emerald-100 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-emerald-700 hover:file:bg-emerald-200"
        />
        <Button type="submit" disabled={pending} size="sm" className="ml-auto bg-emerald-600 hover:bg-emerald-700">
          {pending ? "처리중…" : "업로드"}
        </Button>
      </form>

      <p className="text-[11px] text-muted-foreground">
        점유상태 <b>X→공실</b>(상품화 가능) · <b>O→거주</b>(영구 제외) · <b>△→재방문</b>. 엑셀은 경매 물건 수집에서
        선택 후 <b>‘답사지 엑셀’</b>로 받은 그 파일을 그대로 쓰면 됩니다.
      </p>

      {res &&
        (res.ok ? (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-100/70 border border-emerald-300 px-3 py-2.5 text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <b>{res.region ?? "답사표"}</b> 반영 완료 — 총 {res.total}건 · 공실 {res.vacant} · 거주 {res.occupied} ·
              재방문 {res.recheck}
              {res.created > 0 && ` · 신규등록 ${res.created}`}
              {res.skipped > 0 && ` · 건너뜀 ${res.skipped}`}
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{res.error}</span>
          </div>
        ))}
    </div>
  );
}
