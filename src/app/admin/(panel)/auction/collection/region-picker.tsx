"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, User, ArrowRight, Check, X, Users2, FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { textMatches } from "@/lib/auction/search";
import { idsForRegions } from "./actions";
import { useIssueSheet } from "./use-issue-sheet";

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
  recentTeams = [],
}: {
  regions: RegionCount[];
  total: number;
  /** 최근 사용한 답사팀 — 원클릭 선택용 */
  recentTeams?: string[];
  /** 지역 라벨 -> 최근 발급 (배포 중 배지) */
  issued?: Record<string, { team: string; at: string; returned: boolean }>;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  // 다중 지역 선택 (체크 누적 → 함께 불러오기)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 한 번에 그리는 지역 카드 수 (전부 그리면 느려서 잘라 놓고 "더 보기"로 늘린다)
  const [limit, setLimit] = useState(200);
  const matched = useMemo(
    () => (q.trim() ? regions.filter((r) => textMatches(q, r.region)) : regions),
    [regions, q],
  );
  const filtered = useMemo(() => matched.slice(0, limit), [matched, limit]);
  const shownSum = useMemo(
    () => filtered.reduce((s, r) => s + (r.pending_count ?? 0), 0),
    [filtered],
  );

  // 시/도 묶음 — region 첫 토큰(부산/인천/경기…) 기준. "부산 전체" 한 번에 체크용
  const provinces = useMemo(() => {
    const m = new Map<string, { name: string; regions: string[]; count: number }>();
    for (const r of regions) {
      const head = (r.region || "").trim().split(/\s+/)[0];
      if (!head) continue;
      const key = head
        .replace(/특별자치시|특별자치도|광역시|특별시/g, "")
        .replace(/^(경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주도)$/, (mm) =>
          ({ 경기도: "경기", 강원도: "강원", 충청북도: "충북", 충청남도: "충남", 전라북도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남", 제주도: "제주" })[mm] ?? mm,
        );
      if (!m.has(key)) m.set(key, { name: key, regions: [], count: 0 });
      const g = m.get(key)!;
      g.regions.push(r.region);
      g.count += r.pending_count ?? 0;
    }
    return Array.from(m.values())
      .filter((g) => g.regions.length > 1)
      .sort((a, b) => b.count - a.count);
  }, [regions]);

  // 지역 선택 → 목록을 거치지 않고 곧장 발급
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const { issue, issuing } = useIssueSheet();

  async function quickIssue(kind: "pdf" | "xlsx") {
    const list = Array.from(selected);
    if (list.length === 0) return;
    if (!team.trim()) {
      toast.error("받는 답사팀을 먼저 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await idsForRegions(list);
      if (!res.ok || !res.ids) {
        toast.error(res.error ?? "대상 조회 실패");
        return;
      }
      if (res.ids.length === 0) {
        toast.error("선택한 지역에 미답사 물건이 없습니다.");
        return;
      }
      const label = list.length === 1 ? shortLabel(list[0]) : `${shortLabel(list[0])} 외 ${list.length - 1}곳`;
      if (
        !confirm(
          `${label}\n미답사 ${res.ids.length}건을 [${team.trim()}]에 ${kind === "pdf" ? "PDF" : "엑셀"}로 발급합니다.\n\n발급 이력에 기록되어 다음에 같은 지역을 다른 팀에 줄 때 경고가 뜹니다.`,
        )
      )
        return;
      const ok = await issue({ ids: res.ids, team, kind, label });
      if (ok) {
        setSelected(new Set());
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function toggleProvince(list: string[], allOn: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      list.forEach((r) => (allOn ? n.delete(r) : n.add(r)));
      return n;
    });
  }

  const selectedSum = useMemo(
    () => regions.filter((r) => selected.has(r.region)).reduce((s, r) => s + (r.pending_count ?? 0), 0),
    [regions, selected],
  );

  // 표시용 짧은 라벨 — 시/도 접두어(첫 토큰) 제거. 링크는 전체 region 사용.
  // 시/도를 떼면 "서구"가 인천·부산·대구 어디인지 알 수 없어 답사지를 엉뚱한 곳에 보낼 수 있다.
  // 광역시/특별시/도 표기만 짧게 줄이고 접두어는 남긴다.
  function shortLabel(region: string): string {
    const r = (region || "").trim();
    if (!r) return "(지역 미상)";
    return r
      .replace(/특별자치시|특별자치도|광역시|특별시/g, "")
      .replace(/^(경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주도)/, (m) =>
        ({ 경기도: "경기", 강원도: "강원", 충청북도: "충북", 충청남도: "충남", 전라북도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남", 제주도: "제주" })[m] ?? m,
      )
      .replace(/\s+/g, " ")
      .trim();
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
          미답사 후보 총 <strong className="text-foreground">{total.toLocaleString()}</strong>건 · 지역{" "}
          <strong className="text-foreground">{regions.length.toLocaleString()}</strong>곳. 아래에는{" "}
          <strong className="text-foreground">{filtered.length.toLocaleString()}</strong>곳(
          {shownSum.toLocaleString()}건)만 그려집니다 — 나머지는 검색하거나 &quot;더 보기&quot;로 펼치세요. 전부 올리면 느려서,
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
              placeholder="임대인명 일부만 쳐도 됩니다 (예: 홍 → 홍길동·홍서범 전부) — 전수조사용"
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
          {/* 1차 액션 — 목록을 거치지 않고 바로 발급 */}
          <div className="inline-flex items-center gap-1.5 bg-white border-2 border-teal-400 rounded-lg px-2 py-1">
            <Users2 className="w-4 h-4 text-teal-700 shrink-0" />
            <input
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              list="region-recent-teams"
              placeholder="받는 답사팀"
              className="w-28 text-sm font-bold bg-transparent focus:outline-none"
            />
            <datalist id="region-recent-teams">
              {recentTeams.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          {recentTeams.slice(0, 3).map((t) => (
            <button
              key={t}
              onClick={() => setTeam(t)}
              className={
                "px-2 py-1 rounded-md text-xs font-bold border " +
                (team === t
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-teal-700 border-teal-200 hover:bg-teal-100")
              }
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => quickIssue("xlsx")}
            disabled={issuing || busy}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-black hover:bg-teal-700 disabled:opacity-50"
            title="선택한 지역의 미답사 물건 전부로 답사지 엑셀 발급"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {busy ? "준비 중…" : `답사지 엑셀 발급 (${selectedSum.toLocaleString()}건)`}
          </button>
          <button
            onClick={() => quickIssue("pdf")}
            disabled={issuing || busy}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border-2 border-teal-500 text-teal-700 text-sm font-bold hover:bg-teal-100 disabled:opacity-50"
            title="선택한 지역의 미답사 물건 전부로 답사지 PDF 발급"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>

          <span className="w-px h-6 bg-teal-300" aria-hidden />

          {/* 2차 액션 — 골라서 뽑고 싶을 때 */}
          <button
            onClick={loadSelected}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-sm font-bold text-teal-700 hover:bg-teal-100"
            title="목록에서 물건을 골라 뽑고 싶을 때"
          >
            목록에서 고르기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-sm font-bold text-teal-700 hover:bg-teal-100"
          >
            <X className="w-3.5 h-3.5" /> 선택 해제
          </button>
        </div>
      )}

      {/* 시/도 한 번에 — "부산 전체" 처럼 광역 단위로 묶어 체크 */}
      {provinces.length > 0 && (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-bold mb-2">
            시/도 한 번에 체크
            <span className="font-normal text-muted-foreground ml-1.5">
              — 부산처럼 여러 구로 흩어진 지역을 한 번에 고를 때
            </span>
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {provinces.map((p) => {
              const on = p.regions.every((r) => selected.has(r));
              return (
                <button
                  key={p.name}
                  onClick={() => toggleProvince(p.regions, on)}
                  className={
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border " +
                    (on
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-background text-teal-700 border-teal-200 hover:bg-teal-50")
                  }
                  title={`${p.name} ${p.regions.length}곳 · ${p.count.toLocaleString()}건 ${on ? "해제" : "전체 체크"}`}
                >
                  {p.name} 전체
                  <span className="font-normal opacity-80">
                    {p.regions.length}곳 · {p.count.toLocaleString()}건
                  </span>
                </button>
              );
            })}
          </div>
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
        {matched.length > filtered.length && (
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <p className="text-[11px] text-muted-foreground">
              {matched.length.toLocaleString()}곳 중 {filtered.length.toLocaleString()}곳 표시 ·
              나머지 {(matched.length - filtered.length).toLocaleString()}곳{" "}
              {(total - shownSum).toLocaleString()}건은 아직 안 그렸습니다
            </p>
            <button
              onClick={() => setLimit((n) => n + 300)}
              className="inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-bold text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              300곳 더 보기
            </button>
            <button
              onClick={() => setLimit(matched.length)}
              className="inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-bold text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              전부 펼치기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
