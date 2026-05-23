import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, Clock, Wallet, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWonSuffix, formatWonMan } from "@/lib/money";
import { formatKoreanDate, monthRange } from "@/lib/dates";
import { RentTriggers } from "./triggers";
import type { RentInvoice, Lease, PropertyUnit, Tenant } from "@/types/lease";

async function fetchData() {
  const supabase = await createClient();
  const now = new Date();
  const { start, end } = monthRange(now);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  const [invRes, leaseRes, unitRes, tenantRes] = await Promise.all([
    supabase.from("rent_invoices").select("*").gte("due_date", startIso).lte("due_date", endIso).order("due_date"),
    supabase.from("leases").select("id, unit_id, tenant_id").in("status", ["active", "expiring"]),
    supabase.from("properties_units").select("id, unit_no, property_id, properties:property_id(name)"),
    supabase.from("tenants").select("id, name"),
  ]);
  return {
    invoices: (invRes.data ?? []) as RentInvoice[],
    leases: (leaseRes.data ?? []) as Pick<Lease, "id" | "unit_id" | "tenant_id">[],
    units: (unitRes.data ?? []) as unknown as (Pick<PropertyUnit, "id" | "unit_no"> & { properties: { name: string } | null })[],
    tenants: (tenantRes.data ?? []) as Pick<Tenant, "id" | "name">[],
    monthStart: startIso,
    monthEnd: endIso,
  };
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  unpaid: { l: "미납", c: "bg-blue-100 text-blue-800" },
  partial: { l: "부분납", c: "bg-amber-100 text-amber-800" },
  paid: { l: "완납", c: "bg-green-100 text-green-800" },
  overdue: { l: "연체", c: "bg-red-100 text-red-700" },
  waived: { l: "면제", c: "bg-slate-100 text-slate-700" },
};

export default async function RentDashboardPage() {
  const { invoices, leases, units, tenants } = await fetchData();
  const leaseMap = new Map(leases.map((l) => [l.id, l]));
  const unitMap = new Map(units.map((u) => [u.id, u]));
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  const total = invoices.reduce((s, i) => s + i.amount_total, 0);
  const paid = invoices.reduce((s, i) => s + i.paid_total, 0);
  const outstanding = total - paid;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const partialCount = invoices.filter((i) => i.status === "partial").length;
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
  const rate = total > 0 ? Math.floor((paid * 100) / total) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">이번달 월세 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 청구 {invoices.length}건 · 수금률 {rate}%</p>
        </div>
        <RentTriggers />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard label="청구 합계" value={formatWonSuffix(total)} icon={Wallet} color="text-slate-700 bg-slate-100" />
        <KpiCard label="수금 완료" value={`${paidCount}건 / ${formatWonMan(paid)}`} icon={CheckCircle2} color="text-green-700 bg-green-100" />
        <KpiCard label="부분/미납" value={`${partialCount + unpaidCount}건`} icon={Clock} color="text-amber-700 bg-amber-100" />
        <KpiCard label="연체" value={`${overdueCount}건 / ${formatWonMan(outstanding)}`} icon={AlertTriangle} color="text-red-700 bg-red-100" />
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">이번달 청구서가 없습니다. 좌상단에서 발행 트리거를 실행하거나 계약을 활성화하세요.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>마감일</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>임차인</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>납부</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const lease = leaseMap.get(inv.lease_id);
                  const unit = lease ? unitMap.get(lease.unit_id) : null;
                  const tenantName = lease ? tenantMap.get(lease.tenant_id) : null;
                  const cfg = STATUS_LABEL[inv.status] ?? STATUS_LABEL.unpaid;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{formatKoreanDate(inv.due_date)}</TableCell>
                      <TableCell className="text-sm">{unit?.properties?.name ?? "—"} · {unit?.unit_no}</TableCell>
                      <TableCell className="text-sm">{tenantName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatWonMan(inv.amount_total)}</TableCell>
                      <TableCell className="text-sm">{formatWonMan(inv.paid_total)}</TableCell>
                      <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/rent/invoices/${inv.id}`}>상세 <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
                        </Button>
                      </TableCell>
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

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
