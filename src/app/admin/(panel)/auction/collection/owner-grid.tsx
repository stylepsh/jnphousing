"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, ArrowUpDown } from "lucide-react";
import { textMatches } from "@/lib/auction/search";
import { displayOwnerName } from "@/lib/auction/court-auction";

export interface OwnerPending {
  owner_name: string;
  pending_count: number;
  creditor_types: string | null;
  top_region?: string | null;
}

type SortKey = "count" | "name" | "region";

/**
 * 임대인별 보기 — 한 페이지에 이름(물건수) 카드를 여러 명씩 배치.
 * 총 임대인 수 표시 + 정렬(보유물건수/이름/지역) 드롭다운 + 검색.
 * 카드를 누르면 그 임대인의 전 지역 물건으로 진입.
 */
export function OwnerGrid({ owners }: { owners: OwnerPending[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("count");

  const totalOwners = owners.length;
  const totalItems = useMemo(() => owners.reduce((s, o) => s + (o.pending_count ?? 0), 0), [owners]);
  const hasRegion = useMemo(() => owners.some((o) => !!o.top_region), [owners]);

  // 시/도 접두어 제거한 짧은 지역 라벨
  function shortRegion(region?: string | null): string {
    if (!region) return "";
    const parts = region.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : region;
  }

  const list = useMemo(() => {
    let l = q.trim()
      ? owners.filter((o) => textMatches(q, o.owner_name, o.top_region))
      : owners;
    l = [...l];
    if (sort === "name") {
      l.sort((a, b) => (a.owner_name || "").localeCompare(b.owner_name || "", "ko"));
    } else if (sort === "region") {
      l.sort(
        (a, b) =>
          (a.top_region || "힣").localeCompare(b.top_region || "힣", "ko") ||
          b.pending_count - a.pending_count,
      );
    } else {
      l.sort((a, b) => b.pending_count - a.pending_count);
    }
    return l;
  }, [owners, q, sort]);

  function go(owner: string) {
    router.push(`/admin/auction/collection?owner=${encodeURIComponent(owner)}&ownerExact=1`);
  }

  return (
    <div className="space-y-3">
      {/* 헤더: 총계 + 정렬 + 검색 */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            수집 임대인 <strong className="text-blue-700">{totalOwners.toLocaleString()}</strong>명
            <span className="text-xs font-normal text-muted-foreground">
              · 미답사 합계 {totalItems.toLocaleString()}건
            </span>
          </p>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-transparent text-sm font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="count">보유물건수순</option>
                <option value="name">이름순(가나다)</option>
                <option value="region" disabled={!hasRegion}>
                  지역별{hasRegion ? "" : " (준비중)"}
                </option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="임대인/지역 찾기"
                className="pl-8 pr-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
          </div>
        </div>
        {q && (
          <p className="text-[11px] text-muted-foreground mt-2">
            검색 결과 {list.length.toLocaleString()}명
          </p>
        )}
      </div>

      {/* 카드 그리드 — 한 줄에 여러 명 */}
      {list.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          조건에 맞는 임대인이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
          {list.map((o) => (
            <button
              key={o.owner_name}
              onClick={() => go(o.owner_name)}
              title={`${o.owner_name} · ${o.pending_count}건${o.top_region ? ` · ${o.top_region}` : ""}${
                o.creditor_types ? ` · ${o.creditor_types}` : ""
              }`}
              className="flex items-center justify-between gap-1.5 rounded-lg border border-border bg-background pl-2.5 pr-2 py-2 text-left hover:border-blue-400 hover:bg-blue-50/50 transition"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-bold truncate">{displayOwnerName(o.owner_name)}</span>
                {o.top_region && (
                  <span className="block text-[10px] text-muted-foreground truncate">{shortRegion(o.top_region)}</span>
                )}
              </span>
              <span className="text-[13px] font-black text-blue-700 shrink-0 tabular-nums">
                {o.pending_count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
