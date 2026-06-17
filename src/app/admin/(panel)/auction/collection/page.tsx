import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuctionImportForm } from "./import-form";
import { PoolList, type PoolItem } from "./pool-list";
import { RegionPicker, type RegionCount } from "./region-picker";

export const metadata: Metadata = { title: "경매 물건 수집" };
export const dynamic = "force-dynamic";

const MAX_LOAD = 3000; // 한 지역/임대인 로드 상한 (브라우저 보호)

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

async function fetchFiltered(filter: { region?: string; owner?: string }): Promise<{ items: PoolItem[]; capped: boolean }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("auction_property")
      .select(
        "id, case_number, court, address, owner_name, creditor, creditor_type, category, appraisal_value, minimum_bid, auction_date, dividend_deadline",
      )
      .eq("survey_status", "pending");

    if (filter.owner) query = query.eq("owner_name", filter.owner);
    else if (filter.region) query = query.ilike("address", `${filter.region}%`);

    const { data } = await query.order("created_at", { ascending: false }).limit(MAX_LOAD + 1);
    const rows = (data ?? []) as PoolItem[];
    const capped = rows.length > MAX_LOAD;

    // 상세주소 중복 제거 (정확히 같은 주소면 최근 1건만)
    const seen = new Set<string>();
    const items = rows.slice(0, MAX_LOAD).filter((p) => {
      const key = (p.address ?? "").trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { items, capped };
  } catch {
    return { items: [], capped: false };
  }
}

export default async function AuctionCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; owner?: string }>;
}) {
  const sp = await searchParams;
  const filter = { region: sp.region, owner: sp.owner };
  const hasFilter = !!(filter.region || filter.owner);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black">경매 물건 수집</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          지지옥션·대법원 검색 결과를 붙여넣으면 채권자가{" "}
          <strong className="text-blue-700">주택도시보증공사(HUG)</strong> 또는{" "}
          <strong className="text-purple-700">서울보증보험(SGI)</strong>인 건만 자동 수집됩니다.
          개인채권·은행 등 기타는 배제.
        </p>
      </div>

      <AuctionImportForm />

      {hasFilter ? (
        <FilteredPool filter={filter} />
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

async function FilteredPool({ filter }: { filter: { region?: string; owner?: string } }) {
  const { items, capped } = await fetchFiltered(filter);
  const ownerCount = new Set(items.map((p) => p.owner_name || "(미상)")).size;
  const label = filter.owner ? `임대인 "${filter.owner}"` : filter.region;

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
      {capped && (
        <p className="text-xs text-amber-600 rounded-lg bg-amber-50 px-3 py-2">
          이 범위가 {MAX_LOAD.toLocaleString()}건을 넘어 일부만 불러왔습니다. 더 좁은 지역으로 나눠 발급하세요.
        </p>
      )}
      <PoolList items={items} />
    </section>
  );
}
