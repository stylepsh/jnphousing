"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Search, ArrowUpDown, Plus, Check } from "lucide-react";
import { textMatches } from "@/lib/auction/search";
import { displayOwnerName } from "@/lib/auction/court-auction";
import { useCart } from "@/lib/auction/use-cart";
import { mergeCart, removeFromCart } from "@/lib/auction/selection-cart";
import { cartItemsForOwner } from "./actions";
import { cn } from "@/lib/utils";

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
  // 명단에서 바로 담기 — 카드를 눌러 들어갔다 나오지 않아도 여러 명을 모을 수 있다
  const { cart, setCart } = useCart();
  const [busyOwner, setBusyOwner] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cart) m.set(c.owner_name || "", (m.get(c.owner_name || "") ?? 0) + 1);
    return m;
  }, [cart]);

  function toggleOwnerInCart(owner: string) {
    const have = inCart.get(owner) ?? 0;
    if (have > 0) {
      setCart((prev) => removeFromCart(prev, prev.filter((c) => c.owner_name === owner).map((c) => c.id)));
      toast.success(`[${displayOwnerName(owner)}] ${have}건을 바구니에서 뺐습니다`);
      return;
    }
    setBusyOwner(owner);
    startTransition(async () => {
      const res = await cartItemsForOwner(owner);
      setBusyOwner(null);
      if (!res.ok || !res.items) {
        toast.error(res.error ?? "담기 실패");
        return;
      }
      if (res.items.length === 0) {
        toast.error("담을 미답사 물건이 없습니다");
        return;
      }
      setCart((prev) => mergeCart(prev, res.items!));
      toast.success(`[${displayOwnerName(owner)}] ${res.items.length}건 담았습니다`);
    });
  }

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
            <div
              key={o.owner_name}
              className={cn(
                "flex items-center gap-1 rounded-lg border bg-background pl-2.5 pr-1 py-1 transition",
                (inCart.get(o.owner_name) ?? 0) > 0
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-border hover:border-blue-400 hover:bg-blue-50/50",
              )}
            >
              <button
                onClick={() => go(o.owner_name)}
                title={`${o.owner_name} · ${o.pending_count}건${o.top_region ? ` · ${o.top_region}` : ""}${
                  o.creditor_types ? ` · ${o.creditor_types}` : ""
                } — 눌러서 물건 보기`}
                className="flex items-center justify-between gap-1.5 flex-1 min-w-0 text-left py-1"
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
              <button
                onClick={() => toggleOwnerInCart(o.owner_name)}
                disabled={busyOwner === o.owner_name}
                title={
                  (inCart.get(o.owner_name) ?? 0) > 0
                    ? "바구니에서 빼기"
                    : "이 임대인 물건 전부 바구니에 담기"
                }
                aria-label={
                  (inCart.get(o.owner_name) ?? 0) > 0
                    ? `${o.owner_name} 바구니에서 빼기`
                    : `${o.owner_name} 물건 전부 담기`
                }
                className={cn(
                  "shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md border-2 font-black disabled:opacity-40",
                  (inCart.get(o.owner_name) ?? 0) > 0
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-emerald-300 text-emerald-700 hover:bg-emerald-100",
                )}
              >
                {(inCart.get(o.owner_name) ?? 0) > 0 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
