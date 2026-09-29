"use client";

import { useState, useTransition } from "react";
import { importLeaseSheet, type LeaseImportResult } from "./lease-actions";

export function LeaseUpload() {
  const [res, setRes] = useState<LeaseImportResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-5 space-y-2">
      <h3 className="font-black">임차현황 엑셀 올리기</h3>
      <p className="text-xs text-muted-foreground">
        상품화 엑셀에 <b>임차인·연락처·보증금·월세·계약시작/종료·수금일·중개사</b>를 채워 오면 올리세요. 적힌 줄만 &quot;임차중&quot;으로
        옮기고, 빈 칸은 기존 값을 지우지 않습니다.
      </p>
      <form
        action={(fd) => start(async () => setRes(await importLeaseSheet(fd)))}
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5"
      >
        <input type="file" name="file" accept=".xlsx" required className="text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "처리중…" : "업로드"}
        </button>
      </form>
      {res &&
        (res.ok ? (
          <p className="text-sm text-emerald-800">
            {res.total}줄 중 {res.updated}건 반영 · 새로 임차중 {res.newlyLeased}건
            {res.unmatched.length > 0 && (
              <span className="text-red-700"> · 못 찾음 {res.unmatched.length}건: {res.unmatched.slice(0, 20).join(", ")}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-red-700">{res.error}</p>
        ))}
    </div>
  );
}
