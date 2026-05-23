import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant-session";
import { formatWonSuffix, formatWonMan } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import type { RentInvoice, RentPayment } from "@/types/lease";

export const metadata = { title: "내 청구·납부 내역" };

async function fetchData(leaseId: string) {
  const supabase = createServiceClient();
  const [invRes, payRes] = await Promise.all([
    supabase.from("rent_invoices").select("*").eq("lease_id", leaseId).order("due_date", { ascending: false }).limit(50),
    supabase.from("rent_payments")
      .select("*, invoice:rent_invoices!inner(lease_id, due_date)")
      .eq("invoice.lease_id", leaseId)
      .order("paid_at", { ascending: false })
      .limit(50),
  ]);
  return {
    invoices: (invRes.data ?? []) as RentInvoice[],
    payments: (payRes.data ?? []) as RentPayment[],
  };
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  unpaid: { l: "미납", c: "bg-blue-100 text-blue-800" },
  partial: { l: "부분납", c: "bg-amber-100 text-amber-800" },
  paid: { l: "완납", c: "bg-green-100 text-green-800" },
  overdue: { l: "연체", c: "bg-red-100 text-red-700" },
  waived: { l: "면제", c: "bg-slate-100 text-slate-700" },
};

export default async function MyRentPage() {
  const session = await getTenantSession();
  if (!session) redirect("/tenant/login");

  const { invoices, payments } = await fetchData(session.lease_id);

  const outstanding = invoices.reduce(
    (acc, i) => acc + (i.status === "paid" || i.status === "waived" ? 0 : i.amount_total - i.paid_total),
    0,
  );
  const interest = invoices.reduce((acc, i) => acc + i.overdue_interest, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tenant/my-lease" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 내 계약 정보
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">청구·납부 내역</h1>
      <p className="mt-2 text-sm text-muted-foreground">최근 50건까지 표시됩니다.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">미납 잔액</p><p className="text-xl font-bold mt-1 text-red-700">{formatWonSuffix(outstanding)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">누적 연체이자</p><p className="text-xl font-bold mt-1">{formatWonSuffix(interest)}</p></CardContent></Card>
      </div>

      <Card className="mt-5">
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
                {invoices.map((inv) => {
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

      <h2 className="mt-8 text-lg font-bold">입금 내역</h2>
      <Card className="mt-3">
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">아직 등록된 입금이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>입금일</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>경로</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
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
