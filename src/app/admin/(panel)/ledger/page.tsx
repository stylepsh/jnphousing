import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Plus, Download, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "월별 손익" };
export const dynamic = "force-dynamic";

interface LedgerRow {
  id: string;
  property_id: string | null;
  period_year: number;
  period_month: number;
  category: string;
  subcategory: string | null;
  revenue: number;
  expense: number;
  profit: number;
  description: string | null;
  paid_at: string | null;
  payment_status: string;
}

interface PropertyRow {
  id: string;
  name: string;
  short_alias: string | null;
}

const CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  management_fee:    { label: "관리비 수입",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vendor_payment:    { label: "업체 지급",     color: "bg-amber-50 text-amber-700 border-amber-200" },
  revenue_other:     { label: "기타 수입",     color: "bg-blue-50 text-blue-700 border-blue-200" },
  expense_other:     { label: "기타 지출",     color: "bg-red-50 text-red-700 border-red-200" },
  maintenance:       { label: "수선·유지",     color: "bg-orange-50 text-orange-700 border-orange-200" },
  salary:            { label: "급여",         color: "bg-slate-50 text-slate-700 border-slate-200" },
  office_rent:       { label: "사무실 임대료", color: "bg-purple-50 text-purple-700 border-purple-200" },
  tax:               { label: "세금",         color: "bg-rose-50 text-rose-700 border-rose-200" },
};

interface LedgerProps {
  searchParams: Promise<{ year?: string; month?: string; property?: string }>;
}

async function fetchData(year: number, month: number, propertyId?: string) {
  try {
    const supabase = await createClient();
    let q = supabase.from("monthly_ledger").select("*").eq("period_year", year).eq("period_month", month).order("category");
    if (propertyId && propertyId !== "all") q = q.eq("property_id", propertyId);
    const [lRes, pRes] = await Promise.all([
      q,
      supabase.from("properties").select("id, name, short_alias").order("name"),
    ]);
    return {
      ledger: (lRes.data ?? []) as LedgerRow[],
      properties: (pRes.data ?? []) as PropertyRow[],
    };
  } catch {
    return { ledger: [], properties: [] };
  }
}

export default async function LedgerPage({ searchParams }: LedgerProps) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? (now.getMonth() + 1));
  const propertyId = params.property;

  const { ledger, properties } = await fetchData(year, month, propertyId);
  const propMap = new Map(properties.map(p => [p.id, p]));

  const totalRevenue = ledger.reduce((s, r) => s + r.revenue, 0);
  const totalExpense = ledger.reduce((s, r) => s + r.expense, 0);
  const totalProfit = totalRevenue - totalExpense;

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  // 카테고리별 합계
  const byCategory = ledger.reduce<Record<string, { revenue: number; expense: number }>>((acc, r) => {
    const cat = r.category;
    if (!acc[cat]) acc[cat] = { revenue: 0, expense: 0 };
    acc[cat].revenue += r.revenue;
    acc[cat].expense += r.expense;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            월별 손익 (건물 위탁관리)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {year}년 {month}월 · 건물별 수입·지출·손익
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`?year=${prevMonth.y}&month=${prevMonth.m}`}>← 이전달</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`?year=${nextMonth.y}&month=${nextMonth.m}`}>다음달 →</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/ledger/new"><Plus className="h-3.5 w-3.5 mr-1" /> 항목 추가</Link>
          </Button>
        </div>
      </div>

      {/* 손익 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">총 수입</p>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">+{Math.floor(totalRevenue / 10000).toLocaleString()}만</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">총 지출</p>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-700">-{Math.floor(totalExpense / 10000).toLocaleString()}만</p>
          </CardContent>
        </Card>
        <Card className={totalProfit >= 0 ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">순 손익</p>
              <TrendingUp className={`h-4 w-4 ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`} />
            </div>
            <p className={`text-2xl font-bold tabular-nums ${totalProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {totalProfit >= 0 ? "+" : ""}{Math.floor(totalProfit / 10000).toLocaleString()}만
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 건물 필터 */}
      {properties.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Link href={`?year=${year}&month=${month}`} className={`px-2.5 py-1 text-xs rounded-full ${!propertyId || propertyId === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>전체 건물</Link>
          {properties.map(p => (
            <Link key={p.id} href={`?year=${year}&month=${month}&property=${p.id}`} className={`px-2.5 py-1 text-xs rounded-full ${propertyId === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>
              {p.short_alias ?? p.name}
            </Link>
          ))}
        </div>
      )}

      {/* 카테고리별 요약 */}
      {Object.keys(byCategory).length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="font-bold text-sm mb-3">카테고리별 요약</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(byCategory).map(([cat, val]) => {
                const meta = CATEGORY_LABEL[cat] ?? CATEGORY_LABEL.expense_other;
                const net = val.revenue - val.expense;
                return (
                  <div key={cat} className="rounded border border-border/60 p-2.5">
                    <Badge variant="outline" className={`text-[10px] mb-1.5 ${meta.color}`}>{meta.label}</Badge>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">순</span>
                      <span className={`font-semibold tabular-nums ${net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {net >= 0 ? "+" : ""}{Math.floor(net / 10000).toLocaleString()}만
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상세 테이블 */}
      <Card>
        <CardContent className="p-0">
          {ledger.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{year}년 {month}월 손익 항목 없음</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/admin/ledger/new"><Plus className="h-3.5 w-3.5 mr-1" /> 첫 항목 추가</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>건물</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead className="text-right">수입</TableHead>
                  <TableHead className="text-right">지출</TableHead>
                  <TableHead className="text-right">순익</TableHead>
                  <TableHead>지급일</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map(r => {
                  const prop = r.property_id ? propMap.get(r.property_id) : null;
                  const meta = CATEGORY_LABEL[r.category] ?? CATEGORY_LABEL.expense_other;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{prop?.short_alias ?? prop?.name ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {r.subcategory && <span className="text-muted-foreground">{r.subcategory} · </span>}
                        {r.description ?? "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">{r.revenue ? `+${Math.floor(r.revenue / 10000).toLocaleString()}만` : "-"}</TableCell>
                      <TableCell className="text-right tabular-nums text-red-700">{r.expense ? `-${Math.floor(r.expense / 10000).toLocaleString()}만` : "-"}</TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${r.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {r.profit >= 0 ? "+" : ""}{Math.floor(r.profit / 10000).toLocaleString()}만
                      </TableCell>
                      <TableCell className="text-xs">{r.paid_at?.slice(0, 10) ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.payment_status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
