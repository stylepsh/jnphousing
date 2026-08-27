"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, User, ArrowRight, Check, X } from "lucide-react";
import { textMatches } from "@/lib/auction/search";

export interface RegionCount {
  region: string;
  pending_count: number;
}

/**
 * 30k 후보를 한 번에 브라우저에 올리지 않기 위한 게이트.
 * 답사팀이 요청한 지역을 여러 개 골라 함께 불러오거나(→그 지역들만 로드),
 * 임대인명을 검색하면(→전 지역에 흩어진 그 임대인 물건만 로드) 해당 분량만 풀로 띄운다.
 */
export function RegionPicker({
  regions,
  total,
  issued = {},
}: {
  regions: RegionCount[];
  total: number;
  /** 지역 라벨 -> 최근 발급 (배포 중 배지) */
  issued?: Record<string, { team: string; at: string; returned: boolean }>;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  // 다중 지역 선택 (체크 누적 → 함께 불러오기)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const list = q.trim() ? regions.filter((r) => textMatches(q, r.region)) : regions;
    return list.slice(0, 200);
  }, [regions, q]);

  const selectedSum = useMemo(
    () => regions.filter((r) => selected.has(r.region)).reduce((s, r) => s + (r.pending_count ?? 0), 0),
    [regions, selected],
  );

  // 표시용 짧은 라벨 — 시/도 접두어(첫 토큰) 제거. 링크는 전체 region 사용.
  function shortLabel(region: string): string {
    const parts = region.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : region || "(지역 미상)";
  }

  function toggleRegion(region: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(region)) n.delete(region);
      else n.add(region);
      return n;
    });
  }

  function loadSelected() {
    const arr = Array.from(selected);
    if (arr.length === 0) return;
    if (arr.length === 1) {
      router.push(`/admin/auction/collection?region=${encodeURIComponent(arr[0])}`);
    } else {
      router.push(`/admin/auction/collection?regions=${arr.map(encodeURIComponent).join(",")}`);
    }
  }

  function selectAllVisible() {
    setSelected((s) => {
      const n = new Set(s);
      filtered.forEach((r) => n.add(r.region));
      return n;
    });
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
          답사팀이 요청한 <strong>지역을 여러 개 체크</strong>해 함께 불러오거나 <strong>임대인명</strong>으로 검색해 그 분량만 가져옵니다.
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

      {/* 선택 지역 액션 바 (스티키) */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 rounded-xl border-2 border-teal-300 bg-teal-50 p-3 shadow-sm flex items-center gap-3 flex-wrap">
          <span className="text-sm font-black text-teal-900">
            지역 {selected.size}곳 선택 · 합계{" "}
            <strong className="text-teal-700">{selectedSum.toLocaleString()}</strong>건
          </span>
          <button
            onClick={loadSelected}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
          >
            선택 지역 불러오기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-sm font-bold text-teal-700 hover:bg-teal-100"
          >
            <X className="w-3.5 h-3.5" /> 선택 해제
          </button>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-600" /> 지역별 미답사 건수
            <span className="text-[11px] font-normal text-muted-foreground">— 카드를 눌러 체크(여러 곳 가능)</span>
          </p>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                onClick={selectAllVisible}
                className="text-[11px] font-bold text-teal-700 hover:underline whitespace-nowrap"
              >
                표시중 전체 체크
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="지역 찾기"
                className="pl-8 pr-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">해당 지역이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
            {filtered.map((r) => {
              const active = selected.has(r.region);
              return (
                <button
                  key={r.region}
                  title={r.region}
                  onClick={() => toggleRegion(r.region)}
                  className={
                    "flex items-center justify-between gap-1.5 rounded-lg border pl-2.5 pr-2 py-1.5 text-left transition " +
                    (active
                      ? "border-teal-500 bg-teal-100 ring-1 ring-teal-400"
                      : "border-border bg-background hover:border-teal-400 hover:bg-teal-50/50")
                  }
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={
                        "shrink-0 w-4 h-4 rounded border flex items-center justify-center " +
                        (active ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300 bg-white")
                      }
                    >
                      {active && <Check className="w-3 h-3" />}
                    </span>
                    <span className="text-[13px] font-medium truncate">{shortLabel(r.region)}</span>
                    {issued[r.region] && !issued[r.region].returned && (
                      <span
                        className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0"
                        title={`${issued[r.region].at} ${issued[r.region].team} 배포 — 아직 회수 안 됨`}
                      >
                        {issued[r.region].team} 배포중
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] font-black text-teal-700 shrink-0 tabular-nums">
                    {r.pending_count.toLocaleString()}
                  </span>
                </button>
              );
            })}
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
