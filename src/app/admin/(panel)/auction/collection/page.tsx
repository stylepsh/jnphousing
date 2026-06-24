import type { Metadata } from "next";
import Link from "next/link";
import { Gavel, X, ChevronLeft, ChevronRight, MapPin, Users, User } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { createClient } from "@/lib/supabase/server";
import { AuctionImportForm } from "./import-form";
import { PoolList, type PoolItem } from "./pool-list";
import { RegionPicker, type RegionCount } from "./region-picker";

interface OwnerPending {
  owner_name: string;
  pending_count: number;
  creditor_types: string | null;
}

export const metadata: Metadata = { title: "경매 물건 수집" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

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
  filter: { region?: string; owner?: string },
  page: number,
): Promise<{ items: PoolItem[]; hasNext: boolean; total: number }> {
  try {
    const supabase = await createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("auction_property")
      .select(
        "id, case_number, court, address, owner_name, creditor, creditor_type, category, appraisal_value, minimum_bid, auction_date, dividend_deadline",
      )
      .eq("survey_status", "pending");

    if (filter.owner) query = query.eq("owner_name", filter.owner);
    else if (filter.region) query = query.ilike("address", `${filter.region}%`);

    // 현재 필터의 정확한 전체 건수 (페이지와 무관) — 헤더에 "총 N건" 표시용
    let countQuery = supabase
      .from("auction_property")
      .select("id", { count: "exact", head: true })
      .eq("survey_status", "pending");
    if (filter.owner) countQuery = countQuery.eq("owner_name", filter.owner);
    else if (filter.region) countQuery = countQuery.ilike("address", `${filter.region}%`);

    const [{ data }, { count }] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, to + 1),
      countQuery,
    ]);
    const rows = (data ?? []) as PoolItem[];
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
    return { items, hasNext, total: count ?? 0 };
  } catch {
    return { items: [], hasNext: false, total: 0 };
  }
}

async function fetchOwnerPending(min: number): Promise<OwnerPending[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_auction_owner_pending")
      .select("owner_name, pending_count, creditor_types")
      .gte("pending_count", min)
      .order("pending_count", { ascending: false })
      .limit(500);
    return (data ?? []) as OwnerPending[];
  } catch {
    return [];
  }
}

export default async function AuctionCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; owner?: string; page?: string; view?: string; min?: string }>;
}) {
  const sp = await searchParams;
  const filter = { region: sp.region, owner: sp.owner };
  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);
  const hasFilter = !!(filter.region || filter.owner);
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
          <GateTabs ownerView={ownerView} min={min} />
          {ownerView ? <OwnerGate min={min} /> : <RegionGate />}
        </>
      )}
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
  const { regions, total } = await fetchRegions();
  return <RegionPicker regions={regions} total={total} />;
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

      <div className="rounded-xl border bg-card overflow-hidden">
        {owners.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {min}건 이상 보유한 임대인이 없습니다. 기준을 낮춰보세요.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">임대인</th>
                <th className="px-4 py-2 text-right">보유 미답사</th>
                <th className="px-4 py-2">채권유형</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr key={o.owner_name} className="border-b hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/auction/collection?owner=${encodeURIComponent(o.owner_name)}`}
                      className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:underline"
                    >
                      <User className="w-3.5 h-3.5" /> {o.owner_name || "(소유자 미상)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black tabular-nums">
                      {o.pending_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{o.creditor_types ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

async function FilteredPool({ filter, page }: { filter: { region?: string; owner?: string }; page: number }) {
  const { items, hasNext, total } = await fetchFiltered(filter, page);
  const ownerCount = new Set(items.map((p) => p.owner_name || "(미상)")).size;
  const label = filter.owner ? `임대인 "${filter.owner}"` : filter.region;
  const from = page * PAGE_SIZE;
  const shown = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (filter.region) params.set("region", filter.region);
    if (filter.owner) params.set("owner", filter.owner);
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
      <PoolList items={items} />
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
