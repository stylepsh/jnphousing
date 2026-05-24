"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildingFilterProps {
  buildings: { id: string; name: string }[];
}

/**
 * 임대인이 여러 건물 소유 시 건물별 필터 (P29-93).
 * URL ?buildingId=... 형태.
 */
export function BuildingFilter({ buildings }: BuildingFilterProps) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("buildingId") ?? "all";

  if (buildings.length <= 1) return null;

  function set(id: string) {
    const p = new URLSearchParams(params.toString());
    if (id === "all") p.delete("buildingId");
    else p.set("buildingId", id);
    router.push(`?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      <button
        type="button"
        onClick={() => set("all")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors",
          current === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
        )}
      >
        <Building2 className="h-3 w-3" />
        전체 건물
      </button>
      {buildings.map(b => (
        <button
          key={b.id}
          type="button"
          onClick={() => set(b.id)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-full transition-colors",
            current === b.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
          )}
        >
          {b.name}
        </button>
      ))}
    </div>
  );
}
