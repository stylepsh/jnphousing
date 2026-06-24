import type { Metadata } from "next";
import Link from "next/link";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWon } from "@/lib/auction/case-stages";
import { PageHeader } from "../../../_components/page-header";

const PAGE_SIZE = 100;

export const metadata: Metadata = { title: "경매 임차 현황판" };
export const dynamic = "force-dynamic";

const VACANT_STATES = ["Approved", "WorkPrep", "Merchandising", "Available"];

type LeaseRow = {
  id: string;
  case_number: string;
  address: string;
  owner_name: string | null;
  tenant_name: string | null;
  monthly_rent: number | null;
  deposit: number | null;
  rent_collection_memo: string | null;
  management_fee_rate: number | null;
  pipeline_state: string;
};

type Kpi = { vacant: number; leased: number; occupied: number; recheck: number };

async function fetchData(page: number): Promise<{ kpi: Kpi; rows: LeaseRow[]; hasNext: boolean }> {
  try {
    const supabase = await createClient();
    const { data: states } = await supabase.from("auction_property").select("pipeline_state");
    const kpi: Kpi = { vacant: 0, leased: 0, occupied: 0, recheck: 0 };
    for (const r of (states ?? []) as { pipeline_state: string }[]) {
      const s = r.pipeline_state ?? "Collected";
      if (VACANT_STATES.includes(s)) kpi.vacant++;
      else if (s === "Leased") kpi.leased++;
      else if (s === "OccupiedHold") kpi.occupied++;
      else if (s === "Recheck") kpi.recheck++;
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: rows } = await supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name, tenant_name, monthly_rent, deposit, rent_collection_memo, management_fee_rate, pipeline_state")
      .eq("pipeline_state", "Leased")
      .order("pipeline_entered_at", { ascending: false })
      .range(from, to + 1);

    const allRows = (rows ?? []) as LeaseRow[];
    const hasNext = allRows.length > PAGE_SIZE;
    return { kpi, rows: allRows.slice(0, PAGE_SIZE), hasNext };
  } catch {
    return { kpi: { vacant: 0, leased: 0, occupied: 0, recheck: 0 }, rows: [], hasNext: false };
  }
}

function KpiCard({ label, value, accent, href }: { label: string; value: number; accent: string; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 ${accent} cursor-pointer hover:shadow-md transition-shadow`}
    >
      <div className="text-xs font-bold opacity-80">{label}</div>
      <div className="text-2xl font-black mt-1 tabular-nums">{value}</div>
    </Link>
  );
}

export default async function AuctionLeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(0, parseInt(sp.page ?? "0", 10) || 0);
  const { kpi, rows, hasNext } = await fetchData(page);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Receipt}
        title="경매 임차 현황판"
        accent="emerald"
        desc="경매 파이프라인 물건의 임차 현황을 한눈에 봅니다. 공실·임차중·점유제외·재방문 분포와 임차중 물건의 임대 조건을 확인합니다."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KpiCard label="공실" value={kpi.vacant} accent="bg-teal-50 text-teal-700 border-teal-200" href="/admin/auction/pipeline/vacant" />
        <KpiCard label="임차중" value={kpi.leased} accent="bg-emerald-50 text-emerald-700 border-emerald-200" href="/admin/auction/pipeline/leased" />
        <KpiCard label="점유제외" value={kpi.occupied} accent="bg-purple-50 text-purple-700 border-purple-200" href="/admin/auction/pipeline/occupied" />
        <KpiCard label="재방문" value={kpi.recheck} accent="bg-rose-50 text-rose-700 border-rose-200" href="/admin/auction/pipeline/assign" />
      </div>

      {rows.length === 0 && page === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          임차중인 물건이 없습니다.
        </div>
      ) : (
        <>
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">사건/주소</th>
                  <th className="px-3 py-2 font-semibold">임차인</th>
                  <th className="px-3 py-2 font-semibold">임대인</th>
                  <th className="px-3 py-2 font-semibold text-right">월세</th>
                  <th className="px-3 py-2 font-semibold text-right">보증금</th>
                  <th className="px-3 py-2 font-semibold">수금일</th>
                  <th className="px-3 py-2 font-semibold text-right">수수료율</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-xs text-blue-700">{r.case_number}</div>
                      <div className="line-clamp-1 max-w-[220px]">{r.address}</div>
                    </td>
                    <td className="px-3 py-2.5">{r.tenant_name ?? "-"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.owner_name ?? "-"}</td>
                    <td className="px-3 py-2.5 text-right">{formatWon(r.monthly_rent ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right">{formatWon(r.deposit ?? 0)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.rent_collection_memo ?? "-"}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      {r.management_fee_rate != null ? `${r.management_fee_rate}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 페이지 내비게이션 */}
          <div className="flex items-center justify-center gap-3 py-2">
            {page > 0 ? (
              <Link
                href={page - 1 === 0 ? "/admin/auction/leases" : `/admin/auction/leases?page=${page - 1}`}
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
                href={`/admin/auction/leases?page=${page + 1}`}
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
        </>
      )}
    </div>
  );
}
