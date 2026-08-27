import type { Metadata } from "next";
import Link from "next/link";
import { Gavel, X, ChevronLeft, ChevronRight, MapPin, Users, CalendarDays } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { createClient } from "@/lib/supabase/server";
import { AuctionImportForm } from "./import-form";
import { PoolList, type PoolItem } from "./pool-list";
import { RegionPicker, type RegionCount } from "./region-picker";
import { OwnerGrid, type OwnerPending } from "./owner-grid";
import { normalizeOwnerName } from "@/lib/auction/court-auction";
import { recentTeamNames } from "@/lib/auction/issue-sheet";
import { recentIssuesByRegion } from "../sheets/actions";
import { ScrollMemory } from "./scroll-memory";

export const metadata: Metadata = { title: "경매 물건 수집" };
export const dynamic = "force-dynamic";

// 선택한 지역/임대인 한 묶음은 보통 수백 건 → 한 번에 올려 '전체 선택'이 전부를 잡도록.
// (전체 30k 보호는 앞단 게이트가 담당. 단일 묶음이 이 한도를 넘으면 페이지네이션 유지.)
const PAGE_SIZE = 1000;

/** 차단 임대인 비교키 — 화면에서도 한 번 더 걸러 "차단했는데 또 보인다"를 원천 차단. */
async function fetchBlockedKeys(): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("auction_owner_blocklist").select("owner_key");
    if (error) return new Set();
    return new Set(((data ?? []) as { owner_key: string }[]).map((r) => r.owner_key));
  } catch {
    return new Set();
  }
}

async function fetchRegions(): Promise<{ regions: RegionCount[]; total: number }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_auction_region_pending")
      .select("region, pending_count")
      .order("pending_count", { ascending: false })
      .limit(1000);
    const regions = (data ?? []) as RegionCount[];
    const total = regions.reduce((s, r) => s + (r.pending_count ?? 0), 0);
    return { regions, total };
  } catch {
    return { regions: [], total: 0 };
  }
}

async function fetchFiltered(
  filter: { regions: string[]; owner?: string; batch?: string },
  page: number,
): Promise<{ items: PoolItem[]; hasNext: boolean; total: number }> {
  try {
    const supabase = await createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // 여러 지역은 OR(ilike prefix)로 묶는다. PostgREST or-필터는 와일드카드가 '*'.
    const regionOr = filter.regions.map((r) => `address.ilike.${r}*`).join(",");

    let query = supabase
      .from("auction_property")
      .select(
        "id, case_number, court, address, owner_name, creditor, creditor_type, category, appraisal_value, minimum_bid, auction_date, dividend_deadline, last_issued_at, last_issued_team",
      )
      .eq("survey_status", "pending");

    if (filter.batch) query = query.eq("batch_id", filter.batch);
    if (filter.owner) query = query.eq("owner_name", filter.owner);
    else if (filter.regions.length === 1) query = query.ilike("address", `${filter.regions[0]}%`);
    else if (filter.regions.length > 1) query = query.or(regionOr);

    // 현재 필터의 정확한 전체 건수 (페이지와 무관) — 헤더에 "총 N건" 표시용
    let countQuery = supabase
      .from("auction_property")
      .select("id", { count: "exact", head: true })
      .eq("survey_status", "pending");
    if (filter.batch) countQuery = countQuery.eq("batch_id", filter.batch);
    if (filter.owner) countQuery = countQuery.eq("owner_name", filter.owner);
    else if (filter.regions.length === 1) countQuery = countQuery.ilike("address", `${filter.regions[0]}%`);
    else if (filter.regions.length > 1) countQuery = countQuery.or(regionOr);

    const [{ data }, { count }, blockedKeys] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, to + 1),
      countQuery,
      fetchBlockedKeys(),
    ]);
    const allRows = (data ?? []) as PoolItem[];
    const rows = blockedKeys.size
      ? allRows.filter((p) => !blockedKeys.has(normalizeOwnerName(p.owner_name)))
      : allRows;
    const blockedHidden = allRows.length - rows.length;
    const hasNext = rows.length > PAGE_SIZE;

    // 상세주소 중복 제거 (정확히 같은 주소면 최근 1건만)
    const seen = new Set<string>();
    const items = rows.slice(0, PAGE_SIZE).filter((p) => {
      const key = (p.address ?? "").trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { items, hasNext, total: Math.max(0, (count ?? 0) - blockedHidden) };
  } catch {
    return { items: [], hasNext: false, total: 0 };
  }
}

interface BatchRow {
  id: string;
  name: string;
  created_at: string;
  total_count: number | null;
}

/** 수집 배치(=업로드 회차) 목록 — "7월 올린 것만" 식으로 회차 구분용. */
async function fetchBatches(): Promise<BatchRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("auction_survey_batch")
      .select("id, name, created_at, total_count")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) return [];
    return (data ?? []) as BatchRow[];
  } catch {
    return [];
  }
}

async function fetchOwnerPending(min: number): Promise<OwnerPending[]> {
  try {
    const supabase = await createClient();
    // 마이그레이션 032(top_region) 적용 전이면 컬럼이 없어 에러 → 기본 셀렉트로 폴백.
    const blockedKeys = await fetchBlockedKeys();
    const dropBlocked = (rows: OwnerPending[]) =>
      blockedKeys.size ? rows.filter((o) => !blockedKeys.has(normalizeOwnerName(o.owner_name))) : rows;

    const withRegion = await supabase
      .from("v_auction_owner_pending")
      .select("owner_name, pending_count, creditor_types, top_region")
      .gte("pending_count", min)
      .order("pending_count", { ascending: false })
      .limit(2000);
    if (!withRegion.error) return dropBlocked((withRegion.data ?? []) as OwnerPending[]);

    const basic = await supabase
      .from("v_auction_owner_pending")
      .select("owner_name, pending_count, creditor_types")
      .gte("pending_count", min)
      .order("pending_count", { ascending: false })
      .limit(2000);
    return dropBlocked((basic.data ?? []) as OwnerPending[]);
  } catch {
    return [];
  }
}

export default async function AuctionCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    region?: string;
    regions?: string;
    owner?: string;
    page?: string;
    view?: string;
    min?: string;
    batch?: string;
  }>;
}) {
  const sp = await searchParams;
  const regions = sp.regions
    ? sp.regions.split(",").map((s) => s.trim()).filter(Boolean)
    : sp.region
      ? [sp.region]
      : [];
  const filter = { regions, owner: sp.owner, batch: sp.batch };
  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);
  const hasFilter = !!(regions.length || filter.owner || filter.batch);
  const ownerView = sp.view === "owner";
  const min = Math.max(1, parseInt(sp.min ?? "2", 10) || 2);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Gavel}
        title="경매 물건 수집"
        accent="blue"
        desc={
          <>
            지지옥션·대법원 검색 결과를 붙여넣으면 채권자가{" "}
            <strong className="text-blue-700">주택도시보증공사(HUG)</strong> 또는{" "}
            <strong className="text-purple-700">서울보증보험(SGI)</strong>인 건만 자동 수집됩니다. 개인채권·은행 등 기타는 배제.
          </>
        }
      />

      <AuctionImportForm />

      {hasFilter ? (
        <FilteredPool filter={filter} page={page} />
      ) : (
        <>
          <ScrollMemory scopeKey={ownerView ? "gate-owner" : "gate-region"} />
          <GateBatches />
          <GateTabs ownerView={ownerView} min={min} />
          {ownerView ? <OwnerGate min={min} /> : <RegionGate />}
        </>
      )}
    </div>
  );
}

async function GateBatches() {
  const batches = await fetchBatches();
  return <BatchFilterBar batches={batches} filter={{ regions: [] }} />;
}

function BatchFilterBar({
  batches,
  filter,
  activeBatch,
}: {
  batches: BatchRow[];
  filter: { regions: string[]; owner?: string; batch?: string };
  activeBatch?: BatchRow;
}) {
  if (batches.length === 0) return null;
  const base = new URLSearchParams();
  if (filter.regions.length > 1) base.set("regions", filter.regions.join(","));
  else if (filter.regions.length === 1) base.set("region", filter.regions[0]);
  if (filter.owner) base.set("owner", filter.owner);
  const hrefFor = (batchId?: string) => {
    const p = new URLSearchParams(base);
    if (batchId) p.set("batch", batchId);
    return `/admin/auction/collection?${p.toString()}`;
  };

  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs font-bold flex items-center gap-1.5 mb-2">
        <CalendarDays className="w-3.5 h-3.5 text-blue-600" /> 수집 회차(업로드한 날)
        <span className="font-normal text-muted-foreground">
          — 7월분·9월분을 나눠 뽑으면 같은 물건을 다른 팀에 또 주는 일을 줄일 수 있습니다
        </span>
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link
          href={hrefFor()}
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
            !filter.batch
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-background text-blue-700 border-blue-200 hover:bg-blue-50"
          }`}
        >
          전체 회차
        </Link>
        {batches.slice(0, 12).map((b) => (
          <Link
            key={b.id}
            href={hrefFor(b.id)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
              filter.batch === b.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-background text-blue-700 border-blue-200 hover:bg-blue-50"
            }`}
            title={b.name}
          >
            {b.created_at?.slice(0, 10)}
            <span className="font-normal opacity-80">{b.total_count ?? 0}건</span>
          </Link>
        ))}
        {activeBatch && (
          <span className="text-xs text-muted-foreground ml-1">
            선택: {activeBatch.name}
          </span>
        )}
      </div>
    </div>
  );
}

function GateTabs({ ownerView, min }: { ownerView: boolean; min: number }) {
  return (
    <div className="inline-flex items-center rounded-lg border overflow-hidden text-sm font-bold">
      <Link
        href="/admin/auction/collection"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${!ownerView ? "bg-blue-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
      >
        <MapPin className="w-4 h-4" /> 지역별
      </Link>
      <Link
        href={`/admin/auction/collection?view=owner&min=${min}`}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-l ${ownerView ? "bg-blue-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
      >
        <Users className="w-4 h-4" /> 임대인별
      </Link>
    </div>
  );
}

async function RegionGate() {
  const [{ regions, total }, issued] = await Promise.all([fetchRegions(), recentIssuesByRegion()]);
  return <RegionPicker regions={regions} total={total} issued={issued} />;
}

async function OwnerGate({ min }: { min: number }) {
  const owners = await fetchOwnerPending(min);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-bold mb-1 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-blue-600" /> 임대인별 보기
        </p>
        <p className="text-xs text-muted-foreground">
          보유 <strong>공실 후보가 많은(운용 안 하는) 임대인</strong>을 발굴합니다. 미답사 보유 건수가 많을수록 위로
          정렬됩니다. 임대인을 누르면 전 지역에 흩어진 그 임대인의 <strong>모든 물건</strong>으로 들어갑니다.
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          {[1, 2, 3].map((n) => (
            <Link
              key={n}
              href={`/admin/auction/collection?view=owner&min=${n}`}
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                min === n
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-background text-blue-700 border-blue-200 hover:bg-blue-50"
              }`}
            >
              {n}건↑
            </Link>
          ))}
        </div>
      </div>

      {owners.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {min}건 이상 보유한 임대인이 없습니다. 기준을 낮춰보세요.
        </div>
      ) : (
        <OwnerGrid owners={owners} />
      )}
    </div>
  );
}

async function FilteredPool({
  filter,
  page,
}: {
  filter: { regions: string[]; owner?: string; batch?: string };
  page: number;
}) {
  const [{ items, hasNext, total }, recentTeams, batches] = await Promise.all([
    fetchFiltered(filter, page),
    recentTeamNames(),
    fetchBatches(),
  ]);
  const activeBatch = batches.find((b) => b.id === filter.batch);
  const scopeKey = [
    filter.regions.join("|") || "-",
    filter.owner ?? "-",
    filter.batch ?? "-",
    page,
  ].join("::");
  const ownerCount = new Set(items.map((p) => p.owner_name || "(미상)")).size;
  const label = filter.owner
    ? `임대인 "${filter.owner}"`
    : filter.regions.length > 1
      ? `${filter.regions.length}개 지역`
      : filter.regions[0];
  const from = page * PAGE_SIZE;
  const shown = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (filter.regions.length > 1) params.set("regions", filter.regions.join(","));
    else if (filter.regions.length === 1) params.set("region", filter.regions[0]);
    if (filter.owner) params.set("owner", filter.owner);
    if (filter.batch) params.set("batch", filter.batch);
    if (p > 0) params.set("page", String(p));
    return `/admin/auction/collection?${params.toString()}`;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="font-black">{label}</span>
          <span className="text-muted-foreground">
            총 <strong className="text-foreground">{total.toLocaleString()}</strong>건 · 페이지{" "}
            <strong className="text-foreground">{page + 1}</strong>/{totalPages} · 이 페이지 소유자{" "}
            <strong className="text-foreground">{ownerCount}</strong>명 ({(from + 1).toLocaleString()}–
            {(from + shown).toLocaleString()})
          </span>
          <Link
            href="/admin/auction/collection"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            <X className="w-3 h-3" /> 범위 변경
          </Link>
        </div>
      </div>
      <ScrollMemory scopeKey={scopeKey} />
      <BatchFilterBar batches={batches} filter={filter} activeBatch={activeBatch} />
      <PoolList items={items} recentTeams={recentTeams} scopeKey={scopeKey} />
      {/* 페이지 내비게이션 */}
      <div className="flex items-center justify-center gap-3 py-2">
        {page > 0 ? (
          <Link
            href={buildHref(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" /> 이전
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-bold text-muted-foreground opacity-40 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" /> 이전
          </span>
        )}
        <span className="text-sm font-bold text-muted-foreground">페이지 {page + 1} / {totalPages}</span>
        {hasNext ? (
          <Link
            href={buildHref(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-bold hover:bg-muted"
          >
            다음 <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-bold text-muted-foreground opacity-40 cursor-not-allowed">
            다음 <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </section>
  );
}
