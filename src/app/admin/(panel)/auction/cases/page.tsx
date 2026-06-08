import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CaseRow, type CaseRowData } from "./case-row";

export const metadata: Metadata = { title: "경매/법무 사건관리" };
export const dynamic = "force-dynamic";

async function fetchCases(): Promise<CaseRowData[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_case")
      .select(
        "id, case_number, court, case_type, stage, property_label, auction_date, dividend_deadline, appraisal_value, minimum_bid, claim_amount, tenant_response, assigned_lawyer, lawyer_contact, auction_url",
      )
      .order("created_at", { ascending: false });
    return (data ?? []) as CaseRowData[];
  } catch {
    return [];
  }
}

export default async function AuctionCasesPage() {
  const cases = await fetchCases();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            경매/법무 사건관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            사건번호·법원·압류/추심·배당요구종기일·담당 변호사를 추적합니다. 총{" "}
            <strong className="text-foreground">{cases.length}</strong>건.
          </p>
        </div>
        <Link
          href="/admin/auction/cases/new"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> 사건 등록
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          등록된 경매/법무 사건이 없습니다. 우측 상단 <strong>사건 등록</strong>으로 추가하세요.
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">사건번호</th>
                <th className="px-3 py-2 font-semibold">물건/법원</th>
                <th className="px-3 py-2 font-semibold">주요 일정</th>
                <th className="px-3 py-2 font-semibold">단계</th>
                <th className="px-3 py-2 font-semibold">감정/최저/채권</th>
                <th className="px-3 py-2 font-semibold">대응/HUG</th>
                <th className="px-3 py-2 font-semibold">담당</th>
                <th className="px-3 py-2 font-semibold text-right">삭제</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <CaseRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
