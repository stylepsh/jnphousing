"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWon } from "@/lib/money";
import { rejectAuctionProperties } from "./actions";

export interface PoolItem {
  id: string;
  case_number: string;
  court: string | null;
  address: string;
  owner_name: string;
  creditor: string | null;
  creditor_type: "HUG" | "SGI" | "OTHER" | null;
  category: string | null;
  appraisal_value: number | null;
  minimum_bid: number | null;
  auction_date: string | null;
}

const CREDITOR_BADGE: Record<string, string> = {
  HUG: "bg-blue-100 text-blue-700",
  SGI: "bg-purple-100 text-purple-700",
  OTHER: "bg-slate-100 text-slate-600",
};

export function PoolList({ items }: { items: PoolItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // 소유자별 그룹화
  const groups = useMemo(() => {
    const m = new Map<string, PoolItem[]>();
    for (const it of items) {
      const k = it.owner_name || "(소유자 미상)";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(groupItems: PoolItem[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = groupItems.every((i) => next.has(i.id));
      for (const i of groupItems) {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      }
      return next;
    });
  }

  function handleReject(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`${ids.length}건을 후보 풀에서 제외할까요? (데이터는 보존됩니다)`)) return;
    startTransition(async () => {
      const res = await rejectAuctionProperties(ids);
      if (!res.ok) {
        toast.error(res.error ?? "제외 실패");
        return;
      }
      toast.success(`${res.rejected}건 제외 완료`);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
        수집된 미답사 경매 물건이 없습니다. 위에서 텍스트를 붙여넣어 수집하세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
          <span className="text-sm font-bold">{selected.size}건 선택됨</span>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => handleReject(Array.from(selected))}
            className="ml-auto gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            선택 제외
          </Button>
        </div>
      )}

      {groups.map(([owner, groupItems]) => {
        const allSel = groupItems.every((i) => selected.has(i.id));
        return (
          <details key={owner} open className="rounded-xl border bg-card overflow-hidden">
            <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer bg-muted/40 list-none">
              <input
                type="checkbox"
                checked={allSel}
                onChange={() => toggleGroup(groupItems)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4"
              />
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold">{owner}</span>
              <span className="text-xs text-muted-foreground">{groupItems.length}건</span>
            </summary>
            <div className="divide-y">
              {groupItems.map((it) => (
                <label
                  key={it.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(it.id)}
                    onChange={() => toggle(it.id)}
                    className="mt-1 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{it.case_number}</span>
                      {it.creditor_type && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${CREDITOR_BADGE[it.creditor_type]}`}
                        >
                          {it.creditor_type}
                        </span>
                      )}
                      {it.category && (
                        <span className="text-[11px] text-muted-foreground">{it.category}</span>
                      )}
                      {it.court && (
                        <span className="text-[11px] text-muted-foreground">{it.court}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{it.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      {it.appraisal_value != null && (
                        <span>감정 {formatWon(it.appraisal_value)}</span>
                      )}
                      {it.minimum_bid != null && (
                        <span>최저 {formatWon(it.minimum_bid)}</span>
                      )}
                      {it.auction_date && <span>매각 {it.auction_date}</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
