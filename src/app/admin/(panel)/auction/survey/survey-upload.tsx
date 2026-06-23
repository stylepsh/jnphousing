"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { importSurveySheet, type SurveyImportResult } from "./import-actions";
import { Button } from "@/components/ui/button";

export function SurveyUpload() {
  const [res, setRes] = useState<SurveyImportResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">답사표 엑셀 업로드</h3>
        </div>
        <a
          href="/admin/auction/pipeline/survey-template"
          className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
        >
          <Download className="h-3.5 w-3.5" /> 답사표 양식 다운로드
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        답사자가 채워온 표준 답사표(.xlsx/.csv)를 올리면 사건번호로 매칭해 한 번에 반영합니다.
        점유상태 X→공실(상품화 가능) · O→점유(영구 제외) · △→재방문.
      </p>

      <form
        action={(fd) => start(async () => setRes(await importSurveySheet(fd)))}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx"
          required
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
        />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "처리중…" : "업로드"}
        </Button>
      </form>

      {res &&
        (res.ok ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
            <b>{res.region ?? "답사표"}</b> 적재 완료 — 총 {res.total} · 공실 {res.vacant} · 점유{" "}
            {res.occupied} · 재방문 {res.recheck} · 신규등록 {res.created} · 건너뜀 {res.skipped}
          </div>
        ) : (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {res.error}
          </div>
        ))}
    </div>
  );
}
