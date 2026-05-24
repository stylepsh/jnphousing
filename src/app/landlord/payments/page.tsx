import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Wallet } from "lucide-react";
import { requireLandlord } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { formatWonSuffix, formatWonMan } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { AgencyCommission, RentInvoice } from "@/types/lease";

export const metadata = { title: "월별 정산 내역" };

async function fetchData(landlordId: string) {
  const supabase = createServiceClient();
  const { data: leasesData } = await supabase
    .from("leases")
    .select("id, unit:properties_units(unit_no, property:property_id(name))")
    .eq("landlord_id", landlordId);
  const leases = (leasesData ?? []) as unknown as { id: string; unit: { unit_no: string; property: { name: string } | null } | null }[];
  const leaseIds = leases.map((l) => l.id);
  const leaseMap = new Map(leases.map((l) => [l.id, `${l.unit?.property?.name ?? "—"} · ${l.unit?.unit_no ?? "—"}`]));

  if (leaseIds.length === 0) {
    return { invoices: [], commissions: [], leaseMap };
  }

  const [invRes, comRes] = await Promise.all([
    supabase.from("rent_invoices").select("*").in("lease_id", leaseIds).order("due_date", { ascending: false }).limit(100),
    supabase.from("agency_commissions").select("*").in("lease_id", leaseIds).order("period_end", { ascending: false }).limit(50),
  ]);
  return {
    invoices: (invRes.data ?? []) as RentInvoice[],
    commissions: (comRes.data ?? []) as AgencyCommission[],
    leaseMap,
  };
}

const INV_STATUS_LABEL: Record<string, { l: string; c: string }> = {
  unpaid: { l: "미납", c: "bg-blue-100 text-blue-800" },
  partial: { l: "부분납", c: "bg-amber-100 text-amber-800" },
  paid: { l: "완납", c: "bg-green-100 text-green-800" },
  overdue: { l: "연체", c: "bg-red-100 text-red-700" },
  waived: { l: "면제", c: "bg-slate-100 text-slate-700" },
};

const COM_STATUS_LABEL: Record<string, { l: string; c: string }> = {
  pending: { l: "정산 대기", c: "bg-amber-100 text-amber-800" },
  paid: { l: "정산 완료", c: "bg-green-100 text-green-800" },
  waived: { l: "면제", c: "bg-slate-100 text-slate-700" },
};

export default async function LandlordPaymentsPage() {
  let landlordId: string;
  try {
    const ctx = await requireLandlord();
    landlordId = ctx.landlord.id;
  } catch (e) {
    if (e instanceof AppError) redirect("/landlord/login?error=not_landlord");
    redirect("/landlord/login");
  }

  const { invoices, commissions, leaseMap } = await fetchData(landlordId);
  const totalCollected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paid_total, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "waived")
    .reduce((s, i) => s + Math.max(0, i.amount_total - i.paid_total), 0);
  const totalCommissionPaid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commission_amount, 0);
  const totalCommissionPending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.commission_amount, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/landlord/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> 대시보드</Link>
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">월별 정산 내역</h1>
      <p className="mt-1 text-sm text-muted-foreground">청구·입금·수수료 — 최근 100건 / 50건</p>

      <div className="mt-6 grid sm:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">누적 수금</p><p className="text-lg font-bold mt-1 text-green-700">{formatWonMan(totalCollected)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">미수 잔액</p><p className="text-lg font-bold mt-1 text-red-700">{formatWonMan(totalOutstanding)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">정산 완료 수수료</p><p className="text-lg font-bold mt-1">{formatWonMan(totalCommissionPaid)}</p></CardContent></Card>
        <Card className="border-primary/30 bg-primary/5"><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">정산 대기 수수료</p><p className="text-lg font-bold mt-1 text-primary">{formatWonMan(totalCommissionPending)}</p></CardContent></Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> 청구·입금 내역
            </h2>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">청구 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>마감일</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>청구</TableHead>
                  <TableHead>납부</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const cfg = INV_STATUS_LABEL[inv.status] ?? INV_STATUS_LABEL.unpaid;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{formatKoreanDate(inv.due_date)}</TableCell>
                      <TableCell className="text-xs">{leaseMap.get(inv.lease_id) ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatWonSuffix(inv.amount_total)}</TableCell>
                      <TableCell className="text-sm">{formatWonSuffix(inv.paid_total)}</TableCell>
                      <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">위탁수수료 정산</h2>
          </div>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">정산 내역이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기간</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>기준액</TableHead>
                  <TableHead>수수료</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => {
                  const cfg = COM_STATUS_LABEL[c.status] ?? COM_STATUS_LABEL.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{formatKoreanDate(c.period_start)}<br />~ {formatKoreanDate(c.period_end)}</TableCell>
                      <TableCell className="text-xs">{leaseMap.get(c.lease_id) ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatWonSuffix(c.base_amount)}</TableCell>
                      <TableCell className="text-sm font-bold">{formatWonSuffix(c.commission_amount)}</TableCell>
                      <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
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
