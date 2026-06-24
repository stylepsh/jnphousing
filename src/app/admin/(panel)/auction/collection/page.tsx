import type { Metadata } from "next";
import Link from "next/link";
import { Gavel, X, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { createClient } from "@/lib/supabase/server";
import { AuctionImportForm } from "./import-form";
import { PoolList, type PoolItem } from "./pool-list";
import { RegionPicker, type RegionCount } from "./region-picker";

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
): Promise<{ items: PoolItem[]; hasNext: boolean }> {
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

    const { data } = await query.order("created_at", { ascending: false }).range(from, to + 1);
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
    return { items, hasNext };
  } catch {
    return { items: [], hasNext: false };
  }
}

export default async function AuctionCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; owner?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = { region: sp.region, owner: sp.owner };
  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);
  const hasFilter = !!(filter.region || filter.owner);

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
        <RegionGate />
      )}
    </div>
  );
}

async function RegionGate() {
  const { regions, total } = await fetchRegions();
  return <RegionPicker regions={regions} total={total} />;
}

async function FilteredPool({ filter, page }: { filter: { region?: string; owner?: string }; page: number }) {
  const { items, hasNext } = await fetchFiltered(filter, page);
  const ownerCount = new Set(items.map((p) => p.owner_name || "(미상)")).size;
  const label = filter.owner ? `임대인 "${filter.owner}"` : filter.region;

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
        <div className="flex items-center gap-2 text-sm">
          <span className="font-black">{label}</span>
          <span className="text-muted-foreground">
            소유자 <strong className="text-foreground">{ownerCount}</strong>명 · 물건{" "}
            <strong className="text-foreground">{items.length.toLocaleString()}</strong>건
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
        <span className="text-sm font-bold text-muted-foreground">페이지 {page + 1}</span>
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
