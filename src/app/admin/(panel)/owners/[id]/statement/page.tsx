import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWon } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "../expense-shared";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "임대인 청구서·안내서" };
export const dynamic = "force-dynamic";

const CAT_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, c.label]));

interface LeaseLine {
  unitLabel: string;
  tenantName: string;
  tenantPhone: string | null;
  emergency: string | null;
  startDate: string;
  moveInDate: string | null;
  endDate: string;
  deposit: number;
  rent: number;
  managementFee: number;
}

export default async function OwnerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ownerRow } = await supabase.from("owners").select("*").eq("id", id).maybeSingle();
  if (!ownerRow) notFound();
  const o = ownerRow as Record<string, unknown>;

  // 활성 계약 + 호실 + 임차인
  const { data: leaseRows } = await supabase
    .from("leases")
    .select("unit_id, tenant_id, start_date, move_in_date, end_date, deposit, rent_amount, management_fee")
    .eq("landlord_id", id)
    .in("status", ["active", "expiring", "draft"]);
  const leases = (leaseRows ?? []) as {
    unit_id: string; tenant_id: string; start_date: string; move_in_date: string | null;
    end_date: string; deposit: number; rent_amount: number; management_fee: number;
  }[];

  const unitIds = Array.from(new Set(leases.map((l) => l.unit_id)));
  const tenantIds = Array.from(new Set(leases.map((l) => l.tenant_id)));

  const [{ data: unitRows }, { data: tenantRows }] = await Promise.all([
    unitIds.length ? supabase.from("properties").select("id, unit_no, parent_building_id").in("id", unitIds) : Promise.resolve({ data: [] }),
    tenantIds.length ? supabase.from("tenants").select("id, name, phone, emergency_contact").in("id", tenantIds) : Promise.resolve({ data: [] }),
  ]);
  const unitArr = (unitRows ?? []) as { id: string; unit_no: string | null; parent_building_id: string | null }[];
  const buildingIds = Array.from(new Set(unitArr.map((u) => u.parent_building_id).filter(Boolean) as string[]));
  let bName = new Map<string, string>();
  if (buildingIds.length) {
    const { data: bRows } = await supabase.from("properties").select("id, name").in("id", buildingIds);
    bName = new Map(((bRows ?? []) as { id: string; name: string | null }[]).map((b) => [b.id, b.name ?? "건물"]));
  }
  const unitMap = new Map(unitArr.map((u) => [u.id, u]));
  const tenantMap = new Map(((tenantRows ?? []) as { id: string; name: string; phone: string | null; emergency_contact: string | null }[]).map((t) => [t.id, t]));

  const leaseLines: LeaseLine[] = leases.map((l) => {
    const u = unitMap.get(l.unit_id);
    const b = u?.parent_building_id ? (bName.get(u.parent_building_id) ?? "건물") : "단독호실";
    const t = tenantMap.get(l.tenant_id);
    return {
      unitLabel: u ? `${b} ${u.unit_no ?? ""}호` : "호실",
      tenantName: t?.name ?? "-",
      tenantPhone: t?.phone ?? null,
      emergency: t?.emergency_contact ?? null,
      startDate: l.start_date,
      moveInDate: l.move_in_date,
      endDate: l.end_date,
      deposit: l.deposit,
      rent: l.rent_amount,
      managementFee: l.management_fee,
    };
  });

  // 임대인 부담 지출 (미청구 우선)
  const { data: expRows } = await supabase
    .from("unit_expenses")
    .select("*")
    .eq("owner_id", id)
    .gt("owner_amount", 0)
    .order("incurred_on", { ascending: false });
  const expenses = ((expRows ?? []) as Record<string, unknown>[]).map((e) => ({
    unit_id: e.unit_id as string,
    category: e.category as string,
    description: (e.description as string) ?? null,
    amount: e.amount as number,
    incurred_on: e.incurred_on as string,
    owner_amount: e.owner_amount as number,
    owner_ratio: e.owner_ratio as number,
    company_ratio: e.company_ratio as number,
    split_type: e.split_type as string,
    billed_to_owner: e.billed_to_owner as boolean,
  }));
  const unitLabelById = new Map(unitArr.map((u) => {
    const b = u.parent_building_id ? (bName.get(u.parent_building_id) ?? "건물") : "단독호실";
    return [u.id, `${b} ${u.unit_no ?? ""}호`];
  }));

  const totalOwnerExpense = expenses.reduce((s, e) => s + e.owner_amount, 0);
  const unbilledTotal = expenses.filter((e) => !e.billed_to_owner).reduce((s, e) => s + e.owner_amount, 0);

  const todayLabel = (() => { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; })();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* 인쇄 시 사이드바·여백 숨김 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside { display: none !important; }
          body { background: white !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; }
        }
      ` }} />

      <div className="flex items-center justify-between mb-4 no-print">
        <Link href={`/admin/owners/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 소유주(임대인) 상세
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border bg-white p-8 print:border-0 print:p-0">
        {/* 헤더 */}
        <div className="flex items-start justify-between border-b pb-4 mb-5">
          <div>
            <h1 className="text-xl font-bold">임대인 운영 안내 · 청구서</h1>
            <p className="text-sm text-muted-foreground mt-1">제이앤피(JNP) 주택관리</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">발행일</p>
            <p className="font-medium">{todayLabel}</p>
          </div>
        </div>

        {/* 임대인 정보 */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-muted-foreground mb-2">임대인(소유주) 정보</h2>
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <div><span className="text-muted-foreground">성함 </span><strong>{o.name as string}</strong></div>
            <div><span className="text-muted-foreground">연락처 </span>{(o.phone as string) ?? "-"}</div>
            {(o.business_name as string) && <div><span className="text-muted-foreground">사업자 </span>{o.business_name as string}</div>}
            {(o.account_bank as string) && <div><span className="text-muted-foreground">계좌 </span>{[o.account_bank, o.account_holder].filter(Boolean).join(" ")}</div>}
          </div>
        </section>

        {/* 운영 호실 / 계약 / 임차인 */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-muted-foreground mb-2">운영 호실 · 계약 · 임차인 현황</h2>
          {leaseLines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">활성 계약이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {leaseLines.map((l, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <strong>{l.unitLabel}</strong>
                    <span className="text-muted-foreground">월세 {formatWon(l.rent)}원 / 관리비 {formatWon(l.managementFee)}원</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                    <div><span className="text-muted-foreground">임차인 </span>{l.tenantName}</div>
                    <div><span className="text-muted-foreground">연락처 </span>{l.tenantPhone ?? "-"}</div>
                    <div><span className="text-muted-foreground">비상연락망 </span>{l.emergency ?? "-"}</div>
                    <div><span className="text-muted-foreground">계약일 </span>{l.startDate}</div>
                    <div><span className="text-muted-foreground">입주일 </span>{l.moveInDate ?? l.startDate}</div>
                    <div><span className="text-muted-foreground">계약종료 </span>{l.endDate}</div>
                    <div><span className="text-muted-foreground">보증금 </span>{formatWon(l.deposit)}원</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 지출 청구 내역 */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-muted-foreground mb-2">지출 청구 내역 (임대인 부담분)</h2>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">청구할 지출이 없습니다.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">일자 / 호실</th>
                    <th className="text-left px-3 py-2">항목</th>
                    <th className="text-right px-3 py-2">총지출</th>
                    <th className="text-right px-3 py-2">부담비율</th>
                    <th className="text-right px-3 py-2">임대인 부담</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <div>{unitLabelById.get(e.unit_id) ?? "호실"}</div>
                        <div className="text-xs text-muted-foreground">{e.incurred_on}{e.billed_to_owner ? " · 청구완료" : ""}</div>
                      </td>
                      <td className="px-3 py-2">{CAT_LABEL[e.category] ?? e.category}{e.description ? ` · ${e.description}` : ""}</td>
                      <td className="px-3 py-2 text-right">{formatWon(e.amount)}</td>
                      <td className="px-3 py-2 text-right text-xs">{e.split_type === "owner_all" ? "전액" : `${e.owner_ratio}%`}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatWon(e.owner_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20">
                  <tr>
                    <td className="px-3 py-2 font-bold" colSpan={4}>임대인 부담 합계</td>
                    <td className="px-3 py-2 text-right font-bold text-rose-600">{formatWon(totalOwnerExpense)}원</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* 청구 요약 */}
        <section className="rounded-lg bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold">금회 청구액 (미청구 임대인 부담 지출)</span>
            <span className="text-lg font-bold text-rose-600">{formatWon(unbilledTotal)}원</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ※ 본 안내서는 운영 현황 공유 및 임대인 부담 지출 청구용입니다. 입금 계좌는 별도 안내드립니다.
          </p>
        </section>
      </div>
    </div>
  );
}
