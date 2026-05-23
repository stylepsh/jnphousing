import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDate, formatKoreanDateWithDay } from "@/lib/dates";
import { PaymentForm } from "./payment-form";
import type { RentInvoice, RentPayment, Lease, Tenant, PropertyUnit } from "@/types/lease";

async function fetchAll(id: string) {
  const supabase = await createClient();
  const [invRes, payRes] = await Promise.all([
    supabase
      .from("rent_invoices")
      .select("*, lease:leases(*, tenant:tenants(name, phone), unit:properties_units(unit_no, properties(name)))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("rent_payments").select("*").eq("invoice_id", id).order("paid_at", { ascending: false }),
  ]);
  return {
    invoice: invRes.data as unknown as (RentInvoice & {
      lease: (Lease & {
        tenant: Pick<Tenant, "name" | "phone"> | null;
        unit: (Pick<PropertyUnit, "unit_no"> & { properties: { name: string } | null }) | null;
      }) | null;
    }) | null,
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

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { invoice, payments } = await fetchAll(id);
  if (!invoice) notFound();
  const cfg = STATUS_LABEL[invoice.status] ?? STATUS_LABEL.unpaid;
  const outstanding = Math.max(0, invoice.amount_total - invoice.paid_total);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/rent"><ArrowLeft className="h-4 w-4 mr-1" /> 월세 현황</Link>
      </Button>

      <div className="mb-6">
        <Badge className={`${cfg.c} hover:${cfg.c} mb-2`}>{cfg.l}</Badge>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {invoice.lease?.unit?.properties?.name} · {invoice.lease?.unit?.unit_no}호 청구서
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          임차인: {invoice.lease?.tenant?.name} · 마감일 {formatKoreanDateWithDay(invoice.due_date)}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">청구 합계</p><p className="text-xl font-bold mt-1">{formatWonSuffix(invoice.amount_total)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">납부 합계</p><p className="text-xl font-bold mt-1 text-green-700">{formatWonSuffix(invoice.paid_total)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">잔액</p><p className="text-xl font-bold mt-1 text-red-700">{formatWonSuffix(outstanding)}</p>{invoice.overdue_days > 0 && <p className="text-xs text-muted-foreground mt-1">연체 {invoice.overdue_days}일 · 이자 {formatWonSuffix(invoice.overdue_interest)}</p>}</CardContent></Card>
      </div>

      {/* 입금 등록 */}
      {invoice.status !== "paid" && invoice.status !== "waived" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">입금 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm invoiceId={invoice.id} suggested={outstanding} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">입금 내역 ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">등록된 입금이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>입금일</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>경로</TableHead>
                  <TableHead>메모</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{formatKoreanDate(p.paid_at.slice(0, 10))} {p.paid_at.slice(11, 16)}</TableCell>
                    <TableCell className="text-sm">{formatWonSuffix(p.amount)}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline">{p.source}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.memo ?? "-"}</TableCell>
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
