import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuctionImportForm } from "./import-form";
import { PoolList, type PoolItem } from "./pool-list";

export const metadata: Metadata = { title: "경매 물건 수집" };
export const dynamic = "force-dynamic";

async function fetchPending(): Promise<PoolItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select(
        "id, case_number, court, address, owner_name, creditor, creditor_type, category, appraisal_value, minimum_bid, auction_date",
      )
      .eq("survey_status", "pending")
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as PoolItem[];
    // 상세주소 중복 제거 (정확히 같은 주소면 최근 1건만)
    const seen = new Set<string>();
    return rows.filter((p) => {
      const key = (p.address ?? "").trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

export default async function AuctionCollectionPage() {
  const pending = await fetchPending();
  const ownerCount = new Set(pending.map((p) => p.owner_name || "(미상)")).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black">경매 물건 수집</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          지지옥션·대법원 검색 결과를 붙여넣으면 채권자가{" "}
          <strong className="text-blue-700">주택도시보증공사(HUG)</strong> 또는{" "}
          <strong className="text-purple-700">서울보증보험(SGI)</strong>인 건만 자동 수집됩니다.
          개인채권·은행 등 기타는 배제. 소유자별 그룹에서 다중 선택해 답사로 넘깁니다.
        </p>
      </div>

      <AuctionImportForm />

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-black text-muted-foreground">소유자별 후보 풀</h2>
          <div className="text-xs text-muted-foreground">
            소유자 <strong className="text-foreground">{ownerCount}</strong>명 · 총{" "}
            <strong className="text-foreground">{pending.length}</strong>건
          </div>
        </div>
        <PoolList items={pending} />
      </section>
    </div>
  );
}
