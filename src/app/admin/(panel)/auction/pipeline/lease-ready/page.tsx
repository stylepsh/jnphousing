import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeaseReadyCard, type LeaseReadyItem } from "./lease-ready-card";

export const metadata: Metadata = { title: "임대 계약" };
export const dynamic = "force-dynamic";

async function fetchAvailable(): Promise<LeaseReadyItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name, total_work_cost")
      .eq("pipeline_state", "Available")
      .order("pipeline_entered_at", { ascending: true });
    return (data ?? []) as LeaseReadyItem[];
  } catch {
    return [];
  }
}

export default async function LeaseReadyPage() {
  const items = await fetchAvailable();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 파이프라인
        </Link>
        <h1 className="text-xl font-black mt-2">⑥ 임대 계약</h1>
        <p className="text-sm text-muted-foreground mt-1">
          임대가능 물건에 임차 조건을 입력하면 정산 미리보기와 함께 계약 체결되어 임대중으로 이동합니다. 총{" "}
          <strong className="text-foreground">{items.length}</strong>건.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          임대가능 물건이 없습니다. 상품화 완료된 물건이 여기로 옵니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((it) => (
            <LeaseReadyCard key={it.id} it={it} />
          ))}
        </div>
      )}
    </div>
  );
}
