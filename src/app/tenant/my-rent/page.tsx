import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant-session";
import { formatWonSuffix, formatWonMan } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import type { RentInvoice, RentPayment } from "@/types/lease";

export const metadata = { title: "내 청구·납부 내역" };

const PAGE_SIZE = 12;

interface MyRentProps {
  searchParams: Promise<{ page?: string; year?: string }>;
}

async function fetchData(leaseId: string, page: number, year?: string) {
  const supabase = createServiceClient();
  const offset = (page - 1) * PAGE_SIZE;

  let invQuery = supabase.from("rent_invoices").select("*", { count: "exact" }).eq("lease_id", leaseId).order("due_date", { ascending: false });
  if (year) {
    invQuery = invQuery.gte("due_date", `${year}-01-01`).lte("due_date", `${year}-12-31`);
  }
  const { data: invs, count } = await invQuery.range(offset, offset + PAGE_SIZE - 1);

  const { data: pays } = await supabase.from("rent_payments")
    .select("*, invoice:rent_invoices!inner(lease_id, due_date)")
    .eq("invoice.lease_id", leaseId)
    .order("paid_at", { ascending: false })
    .limit(20);

  // 사용 가능 연도 (전체 invoices 중)
  const { data: yearsData } = await supabase
    .from("rent_invoices")
    .select("due_date")
    .eq("lease_id", leaseId)
    .order("due_date", { ascending: false });
  const yearsSet = new Set<string>();
  for (const r of (yearsData ?? []) as { due_date: string }[]) {
    yearsSet.add(r.due_date.slice(0, 4));
  }
  const years = Array.from(yearsSet).sort().reverse();

  return {
    invoices: (invs ?? []) as RentInvoice[],
    payments: (pays ?? []) as RentPayment[],
    total: count ?? 0,
    years,
  };
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  unpaid:  { l: "미납",   c: "bg-blue-100 text-blue-800" },
  partial: { l: "부분납", c: "bg-amber-100 text-amber-800" },
  paid:    { l: "완납",   c: "bg-green-100 text-green-800" },
  overdue: { l: "연체",   c: "bg-red-100 text-red-700" },
  waived:  { l: "면제",   c: "bg-slate-100 text-slate-700" },
};

function groupByMonth(invoices: RentInvoice[]): Array<{ key: string; items: RentInvoice[] }> {
  const groups: Record<string, RentInvoice[]> = {};
  for (const inv of invoices) {
    const ym = inv.due_date.slice(0, 7);
    (groups[ym] ||= []).push(inv);
  }
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({ key, items }));
}

export default async function MyRentPage({ searchParams }: MyRentProps) {
  const session = await getTenantSession();
  if (!session) redirect("/tenant/login");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));
  const year = sp.year;

  const { invoices, payments, total, years } = await fetchData(session.lease_id, page, year);

  const outstanding = invoices.reduce(
    (acc, i) => acc + (i.status === "paid" || i.status === "waived" ? 0 : i.amount_total - i.paid_total), 0
  );
  const interest = invoices.reduce((acc, i) => acc + i.overdue_interest, 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const groups = groupByMonth(invoices);

  function pageHref(p: number): string {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (year) params.set("year", year);
    return `?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tenant/my-lease" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 내 계약 정보
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">청구·납부 내역</h1>
      <p className="mt-2 text-sm text-muted-foreground">총 {total}건 · {page}/{Math.max(totalPages, 1)}페이지</p>

      {/* 연도 필터 */}
      {years.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Link href="?" className={`px-2.5 py-1 text-xs rounded-full transition-colors ${!year ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>
            전체
          </Link>
          {years.map(y => (
            <Link key={y} href={`?year=${y}`} className={`px-2.5 py-1 text-xs rounded-full transition-colors ${year === y ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>
              {y}년
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">미납 잔액</p><p className="text-xl font-bold mt-1 text-red-700">{formatWonSuffix(outstanding)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">누적 연체이자</p><p className="text-xl font-bold mt-1">{formatWonSuffix(interest)}</p></CardContent></Card>
      </div>

      {/* 모바일 카드 (md: 미만) */}
      <div className="mt-5 md:hidden space-y-4">
        {groups.map(g => (
          <div key={g.key}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
              {g.key.replace("-", "년 ") + "월"}
            </h3>
            <div className="space-y-2">
              {g.items.map(inv => {
                const cfg = STATUS_LABEL[inv.status] ?? STATUS_LABEL.unpaid;
                return (
                  <Card key={inv.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{formatKoreanDate(inv.due_date)}</span>
                        <Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">청구</span><div className="font-bold">{formatWonMan(inv.amount_total)}</div></div>
                        <div><span className="text-muted-foreground">납부</span><div className="font-bold">{formatWonMan(inv.paid_total)}</div></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
        {invoices.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">아직 청구된 내역이 없습니다.</p>
        )}
      </div>

      {/* 데스크톱 테이블 (md: 이상) */}
      <Card className="mt-5 hidden md:block">
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">아직 청구된 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>마감일</TableHead>
                  <TableHead>청구</TableHead>
                  <TableHead>납부</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => {
                  const cfg = STATUS_LABEL[inv.status] ?? STATUS_LABEL.unpaid;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{formatKoreanDate(inv.due_date)}</TableCell>
                      <TableCell className="text-sm">{formatWonMan(inv.amount_total)}</TableCell>
                      <TableCell className="text-sm">{formatWonMan(inv.paid_total)}</TableCell>
                      <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm ${page === 1 ? "opacity-30 pointer-events-none" : "hover:bg-muted"}`}
            aria-disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" /> 이전
          </Link>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm ${page === totalPages ? "opacity-30 pointer-events-none" : "hover:bg-muted"}`}
            aria-disabled={page === totalPages}
          >
            다음 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <h2 className="mt-8 text-lg font-bold">최근 입금 내역</h2>
      <div className="mt-3 space-y-2 md:hidden">
        {payments.map(p => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between text-sm">
              <span>{formatKoreanDate(p.paid_at.slice(0, 10))}</span>
              <span className="font-bold">{formatWonSuffix(p.amount)}</span>
              <Badge variant="outline" className="text-[10px]">{p.source}</Badge>
            </CardContent>
          </Card>
        ))}
        {payments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">입금 내역 없음</p>}
      </div>
      <Card className="mt-3 hidden md:block">
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">아직 등록된 입금이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>입금일</TableHead><TableHead>금액</TableHead><TableHead>경로</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{formatKoreanDate(p.paid_at.slice(0, 10))}</TableCell>
                    <TableCell className="text-sm">{formatWonSuffix(p.amount)}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline">{p.source}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
