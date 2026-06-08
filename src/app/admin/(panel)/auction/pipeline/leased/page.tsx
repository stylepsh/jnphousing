import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcSettlement } from "@/lib/auction/pipeline/settlement";
import { formatWon } from "@/lib/auction/case-stages";
import { PipelineActions } from "../pipeline-actions";

export const metadata: Metadata = { title: "임대중 · 정산" };
export const dynamic = "force-dynamic";

type LeasedRow = {
  id: string;
  case_number: string;
  address: string;
  owner_name: string | null;
  tenant_name: string | null;
  monthly_rent: number | null;
  management_fee_rate: number | null;
  individual_tax_rate: number | null;
  total_work_cost: number | null;
};

async function fetchLeased(): Promise<LeasedRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name, tenant_name, monthly_rent, management_fee_rate, individual_tax_rate, total_work_cost")
      .eq("pipeline_state", "Leased")
      .order("pipeline_entered_at", { ascending: false });
    return (data ?? []) as LeasedRow[];
  } catch {
    return [];
  }
}

export default async function LeasedPage() {
  const rows = await fetchLeased();
  const totalPayout = rows.reduce((sum, r) => {
    const s = calcSettlement({
      monthlyRent: r.monthly_rent ?? 0,
      managementFeeRate: r.management_fee_rate ?? 0,
      individualTaxRate: r.individual_tax_rate ?? 0,
      totalWorkCost: 0, // 작업비는 최초 정산에서만 차감 가정 — 월 정산엔 미반영
    });
    return sum + s.payout;
  }, 0);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 파이프라인
        </Link>
        <h1 className="text-xl font-black mt-2">⑦ 임대중 · 정산</h1>
        <p className="text-sm text-muted-foreground mt-1">
          임대 중인 물건의 월 정산(임대인 지급액)을 확인합니다. 총{" "}
          <strong className="text-foreground">{rows.length}</strong>건 · 월 임대인 지급 합계{" "}
          <strong className="text-foreground">{formatWon(totalPayout)}</strong>.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          임대중인 물건이 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">사건/주소</th>
                <th className="px-3 py-2 font-semibold">임차인</th>
                <th className="px-3 py-2 font-semibold text-right">월세</th>
                <th className="px-3 py-2 font-semibold text-right">수수료</th>
                <th className="px-3 py-2 font-semibold text-right">세금</th>
                <th className="px-3 py-2 font-semibold text-right">임대인 지급</th>
                <th className="px-3 py-2 font-semibold">동작</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = calcSettlement({
                  monthlyRent: r.monthly_rent ?? 0,
                  managementFeeRate: r.management_fee_rate ?? 0,
                  individualTaxRate: r.individual_tax_rate ?? 0,
                  totalWorkCost: 0,
                });
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-xs text-blue-700">{r.case_number}</div>
                      <div className="line-clamp-1 max-w-[220px]">{r.address}</div>
                      <div className="text-xs text-muted-foreground">{r.owner_name ?? "-"}</div>
                    </td>
                    <td className="px-3 py-2.5">{r.tenant_name ?? "-"}</td>
                    <td className="px-3 py-2.5 text-right">{formatWon(s.rent)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{formatWon(s.fee)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{formatWon(s.tax)}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{formatWon(s.payout)}</td>
                    <td className="px-3 py-2.5">
                      <PipelineActions
                        propertyId={r.id}
                        buttons={[
                          { action: "EXTEND", label: "연장" },
                          { action: "VACATE", label: "퇴거", danger: true, confirm: "퇴거 처리하면 상품화준비로 돌아갑니다. 진행할까요?" },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
