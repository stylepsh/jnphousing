"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, User, ArrowRight } from "lucide-react";

export interface RegionCount {
  region: string;
  pending_count: number;
}

/**
 * 30k 후보를 한 번에 브라우저에 올리지 않기 위한 게이트.
 * 답사팀이 요청한 지역을 고르거나(→그 지역만 로드), 임대인명을 검색하면
 * (→전 지역에 흩어진 그 임대인 물건만 로드) 해당 분량만 풀로 띄운다.
 */
export function RegionPicker({ regions, total }: { regions: RegionCount[]; total: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? regions.filter((r) => r.region.toLowerCase().includes(s)) : regions;
    return list.slice(0, 200);
  }, [regions, q]);

  // 표시용 짧은 라벨 — 시/도 접두어(첫 토큰) 제거. 링크는 전체 region 사용.
  function shortLabel(region: string): string {
    const parts = region.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : region || "(지역 미상)";
  }

  function goOwner() {
    const v = owner.trim();
    if (!v) return;
    router.push(`/admin/auction/collection?owner=${encodeURIComponent(v)}`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-bold mb-1">답사지 발급 — 먼저 범위를 고르세요</p>
        <p className="text-xs text-muted-foreground">
          미답사 후보 총 <strong className="text-foreground">{total.toLocaleString()}</strong>건. 전부 올리면 느려서,
          답사팀이 요청한 <strong>지역</strong>을 누르거나 <strong>임대인명</strong>으로 검색해 그 분량만 불러옵니다.
        </p>

        {/* 임대인 검색 게이트 (전 지역 가로지름) */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goOwner()}
              placeholder="임대인명으로 전 지역 불러오기 (예: 김민영) — 전수조사용"
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={goOwner}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
          >
            불러오기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-600" /> 지역별 미답사 건수
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="지역 찾기"
              className="pl-8 pr-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">해당 지역이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
            {filtered.map((r) => (
              <button
                key={r.region}
                title={r.region}
                onClick={() => router.push(`/admin/auction/collection?region=${encodeURIComponent(r.region)}`)}
                className="flex items-center justify-between gap-1.5 rounded-lg border bg-background pl-2.5 pr-2 py-1.5 text-left hover:border-teal-400 hover:bg-teal-50/50 transition"
              >
                <span className="text-[13px] font-medium truncate">{shortLabel(r.region)}</span>
                <span className="text-[13px] font-black text-teal-700 shrink-0 tabular-nums">{r.pending_count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
        {regions.length > filtered.length && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {regions.length.toLocaleString()}개 지역 중 {filtered.length}개 표시 — 위 검색으로 좁히세요.
          </p>
        )}
      </div>
    </div>
  );
}
