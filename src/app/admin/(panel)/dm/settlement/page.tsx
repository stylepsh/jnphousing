import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, TrendingUp, Plus, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfitShareDef } from "@/lib/data/dm-profit-share";

export const metadata: Metadata = { title: "JNP 월별 정산" };
export const dynamic = "force-dynamic";

interface SettlementRow {
  id: string;
  dm_unit_id: string | null;
  landlord_business_id: string | null;
  period_year: number;
  period_month: number;
  revenue: number;
  company_share: number;
  landlord_share: number;
  third_party_share: number;
  third_party_name: string | null;
  previous_balance: number;
  current_balance: number;
  accumulated_balance: number;
  payment_status: string;
  payment_method: string | null;
  paid_amount: number;
  paid_at: string | null;
  notes: string | null;
}

interface DmUnit {
  id: string;
  alias: string | null;
  profit_share_ratio: string | null;
}

interface LandlordBiz {
  id: string;
  name: string;
}

interface SettlementPageProps {
  searchParams: Promise<{ year?: string; month?: string; status?: string }>;
}

async function fetchData(year: number, month: number, statusFilter?: string) {
  try {
    const supabase = await createClient();
    let q = supabase.from("dm_monthly_settlement").select("*").eq("period_year", year).eq("period_month", month);
    if (statusFilter && statusFilter !== "all") q = q.eq("payment_status", statusFilter);
    const [sRes, uRes, lRes] = await Promise.all([
      q.order("landlord_business_id"),
      supabase.from("dm_units").select("id, alias, profit_share_ratio"),
      supabase.from("landlord_business").select("id, name"),
    ]);
    return {
      settlements: (sRes.data ?? []) as SettlementRow[],
      units: new Map(((uRes.data ?? []) as DmUnit[]).map(u => [u.id, u])),
      landlords: new Map(((lRes.data ?? []) as LandlordBiz[]).map(l => [l.id, l])),
    };
  } catch {
    return { settlements: [], units: new Map(), landlords: new Map() };
  }
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:   { label: "대기",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  partial:   { label: "부분지급", color: "bg-blue-100 text-blue-700 border-blue-200" },
  paid:      { label: "지급완료", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  withheld:  { label: "보류",   color: "bg-slate-100 text-slate-600 border-slate-200" },
  rejected:  { label: "거절",   color: "bg-red-100 text-red-700 border-red-200" },
};

export default async function SettlementPage({ searchParams }: SettlementPageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? (now.getMonth() + 1));
  const status = params.status ?? "all";

  const { settlements, units, landlords } = await fetchData(year, month, status);

  const totalRevenue = settlements.reduce((s, r) => s + r.revenue, 0);
  const totalLandlord = settlements.reduce((s, r) => s + r.landlord_share, 0);
  const totalCompany = settlements.reduce((s, r) => s + r.company_share, 0);
  const totalThirdParty = settlements.reduce((s, r) => s + r.third_party_share, 0);
  const totalPaid = settlements.reduce((s, r) => s + r.paid_amount, 0);
  const totalPending = totalLandlord - totalPaid;

  // 이전/다음 월 링크
  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <Link href="/admin/dm" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> JNP 단기임대
      </Link>

      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">월별 정산</h1>
          <p className="mt-1 text-sm text-muted-foreground">{year}년 {month}월 · 임대인별 수익 분배</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`?year=${prevMonth.y}&month=${prevMonth.m}&status=${status}`}>← 이전달</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`?year=${nextMonth.y}&month=${nextMonth.m}&status=${status}`}>다음달 →</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/dm/settlement/new"><Plus className="h-3.5 w-3.5 mr-1" /> 정산 추가</Link>
          </Button>
        </div>
      </div>

      {/* 요약 KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">총 수익</p><p className="mt-1 text-xl font-bold tabular-nums text-purple-700">{Math.floor(totalRevenue / 10000).toLocaleString()}만</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">임대인 지급</p><p className="mt-1 text-xl font-bold tabular-nums text-blue-700">{Math.floor(totalLandlord / 10000).toLocaleString()}만</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">회사 수익</p><p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{Math.floor(totalCompany / 10000).toLocaleString()}만</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">제3자</p><p className="mt-1 text-xl font-bold tabular-nums">{Math.floor(totalThirdParty / 10000).toLocaleString()}만</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[10px] uppercase text-muted-foreground">미지급 잔액</p><p className="mt-1 text-xl font-bold tabular-nums text-red-700">{Math.floor(totalPending / 10000).toLocaleString()}만</p></CardContent></Card>
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link href={`?year=${year}&month=${month}`} className={`px-2.5 py-1 text-xs rounded-full ${status === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>전체</Link>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <Link key={key} href={`?year=${year}&month=${month}&status=${key}`} className={`px-2.5 py-1 text-xs rounded-full ${status === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>
            {meta.label}
          </Link>
        ))}
      </div>

      {/* 정산 테이블 */}
      <Card>
        <CardContent className="p-0">
          {settlements.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{year}년 {month}월 정산 데이터 없음</p>
              <p className="text-xs text-muted-foreground mt-1">매월 1일 03:00 자동 생성 또는 수동 등록</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>호실</TableHead>
                  <TableHead>임대인</TableHead>
                  <TableHead>비율</TableHead>
                  <TableHead className="text-right">수익</TableHead>
                  <TableHead className="text-right">임대인 몫</TableHead>
                  <TableHead className="text-right">회사 몫</TableHead>
                  <TableHead className="text-right">이월</TableHead>
                  <TableHead className="text-right">누계</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map(s => {
                  const unit = s.dm_unit_id ? units.get(s.dm_unit_id) : null;
                  const landlord = s.landlord_business_id ? landlords.get(s.landlord_business_id) : null;
                  const ratio = unit?.profit_share_ratio ? getProfitShareDef(unit.profit_share_ratio) : null;
                  const statusMeta = STATUS_META[s.payment_status] ?? STATUS_META.pending;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{unit?.alias ?? "-"}</TableCell>
                      <TableCell>{landlord?.name ?? "-"}</TableCell>
                      <TableCell>
                        {ratio && <Badge variant="outline" className="text-[10px] font-mono">{ratio.label}</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{Math.floor(s.revenue / 10000).toLocaleString()}만</TableCell>
                      <TableCell className="text-right tabular-nums text-blue-700 font-semibold">{Math.floor(s.landlord_share / 10000).toLocaleString()}만</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">{Math.floor(s.company_share / 10000).toLocaleString()}만</TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{Math.floor(s.previous_balance / 10000).toLocaleString()}만</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{Math.floor(s.accumulated_balance / 10000).toLocaleString()}만</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusMeta.color}`}>{statusMeta.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="outline" asChild>
          <a href={`/admin/dm/settlement/export?year=${year}&month=${month}`}>
            <Download className="h-3.5 w-3.5 mr-1" /> 엑셀 다운로드
          </a>
        </Button>
      </div>
    </div>
  );
}
