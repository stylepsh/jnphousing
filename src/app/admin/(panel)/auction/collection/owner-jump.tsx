"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * 다른 임대인 바로 검색 — 물건 목록에서 나갔다 들어오지 않고 검색 범위를 갈아탄다.
 * 고른 물건은 취합 장바구니에 남으므로, 여러 명을 이어서 검색·체크한 뒤 한 번에 발급할 수 있다.
 */
export function OwnerJump({ current, exact }: { current?: string; exact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const name = q.trim();
    if (!name) return;
    router.push(`/admin/auction/collection?owner=${encodeURIComponent(name)}`);
    setQ("");
  }

  return (
    <form onSubmit={go} className="flex items-center gap-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="다른 임대인 검색 (예: 홍길동)"
          className="pl-8 pr-7 py-1.5 rounded-lg border bg-background text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!q.trim()}
        className="px-2.5 py-1.5 rounded-lg border text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 disabled:opacity-40"
      >
        검색
      </button>
      {current && (
        <span className="text-xs text-muted-foreground">
          지금: {current}
          {exact ? "" : " 포함"}
        </span>
      )}
    </form>
  );
}
