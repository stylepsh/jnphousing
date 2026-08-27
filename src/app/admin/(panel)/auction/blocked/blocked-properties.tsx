"use client";

import { useMemo, useState } from "react";
import { Search, X, FileSpreadsheet } from "lucide-react";
import { formatWon } from "@/lib/money";
import { textMatches } from "@/lib/auction/search";
import { normalizeOwnerName } from "@/lib/auction/court-auction";
import type { BlockedProperty } from "../collection/actions";

/** 차단 보관 물건 — 임대인별 묶음 + 검색 + CSV 내보내기. */
export function BlockedProperties({ props }: { props: BlockedProperty[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      q.trim()
        ? props.filter((p) => textMatches(q, p.owner_name, p.address, p.case_number))
        : props,
    [props, q],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; list: BlockedProperty[] }>();
    for (const p of filtered) {
      const k = normalizeOwnerName(p.owner_name) || p.owner_name;
      if (!m.has(k)) m.set(k, { name: p.owner_name, list: [] });
      m.get(k)!.list.push(p);
    }
    return Array.from(m.values()).sort((a, b) => b.list.length - a.list.length);
  }, [filtered]);

  function exportCsv() {
    const head = ["임대인", "사건번호", "주소", "채권자", "감정가"];
    const lines = [
      head,
      ...filtered.map((p) => [
        p.owner_name,
        p.case_number,
        p.address,
        p.creditor_type ?? "",
        String(p.appraisal_value ?? ""),
      ]),
    ]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    // 엑셀에서 한글이 깨지지 않도록 BOM
    const blob = new Blob(["﻿" + lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `차단임대인_보관물건_${filtered.length}건.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="임대인·주소·사건번호 검색"
            className="w-full pl-9 pr-8 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border text-sm font-bold hover:bg-muted disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" /> 엑셀(CSV) 내보내기
        </button>
      </div>

      {q && (
        <p className="text-xs text-muted-foreground">
          검색 결과: 임대인 {grouped.length}명 · 물건 {filtered.length}건 (전체 {props.length}건 중)
        </p>
      )}

      {grouped.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {q
            ? "검색 조건에 맞는 보관 물건이 없습니다."
            : "보관된 물건이 없습니다. 임대인을 차단하면 그 임대인의 물건이 이곳으로 옮겨집니다."}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <details key={g.name} className="rounded-xl border bg-card" open={Boolean(q)}>
              <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 text-sm font-bold">
                <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px] font-black">
                  {(g.name[0] ?? "?").toUpperCase()}
                </span>
                {g.name}
                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {g.list.length}건
                </span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  감정가 {formatWon(g.list.reduce((s, p) => s + (p.appraisal_value ?? 0), 0))}
                </span>
              </summary>
              <ul className="divide-y border-t text-sm">
                {g.list.map((p) => (
                  <li key={p.id} className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">
                      {p.case_number}
                    </span>
                    <span className="flex-1 min-w-[200px]">{p.address}</span>
                    {p.creditor_type && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {p.creditor_type}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatWon(p.appraisal_value ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
