import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Building2, AlertTriangle, CheckCircle2, ArrowRight, FileText, Phone } from "lucide-react";
import { requireLandlord } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { formatWonSuffix, formatWonMan } from "@/lib/money";
import { formatKoreanDate, isExpiringSoon, monthRange } from "@/lib/dates";
import { LandlordLogoutButton } from "./logout-button";
import { AppError } from "@/lib/errors";
import { COMPANY } from "@/lib/company";
import type { Lease, RentInvoice, AgencyCommission, Tenant, PropertyUnit } from "@/types/lease";
import type { Property } from "@/types/database";

export const metadata = { title: "내 자산 대시보드" };

async function fetchLandlordData(landlordId: string) {
  const supabase = createServiceClient();
  const now = new Date();
  const { start, end } = monthRange(now);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  const { data: leasesData } = await supabase
    .from("leases")
    .select("*, tenant:tenants(name, phone), unit:properties_units(id, unit_no, property:property_id(id, name, address))")
    .eq("landlord_id", landlordId)
    .order("end_date", { ascending: true });
  const leases = (leasesData ?? []) as unknown as (Lease & {
    tenant: Pick<Tenant, "name" | "phone"> | null;
    unit: (Pick<PropertyUnit, "id" | "unit_no"> & {
      property: Pick<Property, "id" | "name" | "address"> | null;
    }) | null;
  })[];
  const activeLeases = leases.filter((l) => l.status === "active" || l.status === "expiring");

  const leaseIds = leases.map((l) => l.id);

  const [invThisMonthRes, invOverdueRes, commPendingRes] = await Promise.all([
    leaseIds.length > 0
      ? supabase
        .from("rent_invoices")
        .select("amount_total, paid_total, status, lease_id")
        .in("lease_id", leaseIds)
        .gte("due_date", startIso)
        .lte("due_date", endIso)
      : Promise.resolve({ data: [] }),
    leaseIds.length > 0
      ? supabase
        .from("rent_invoices")
        .select("id, amount_total, paid_total, due_date, lease_id, overdue_interest")
        .in("lease_id", leaseIds)
        .eq("status", "overdue")
      : Promise.resolve({ data: [] }),
    leaseIds.length > 0
      ? supabase
        .from("agency_commissions")
        .select("commission_amount, base_amount")
        .in("lease_id", leaseIds)
        .eq("status", "pending")
      : Promise.resolve({ data: [] }),
  ]);

  const invThisMonth = (invThisMonthRes.data ?? []) as Pick<RentInvoice, "amount_total" | "paid_total" | "status" | "lease_id">[];
  const invOverdue = (invOverdueRes.data ?? []) as (Pick<RentInvoice, "id" | "amount_total" | "paid_total" | "due_date" | "lease_id" | "overdue_interest">)[];
  const commPending = (commPendingRes.data ?? []) as Pick<AgencyCommission, "commission_amount" | "base_amount">[];

  const billingTotal = invThisMonth.reduce((s, i) => s + i.amount_total, 0);
  const billingPaid = invThisMonth.reduce((s, i) => s + i.paid_total, 0);
  const collectionRate = billingTotal > 0 ? Math.round((billingPaid * 100) / billingTotal) : 0;
  const overdueOutstanding = invOverdue.reduce((s, i) => s + Math.max(0, i.amount_total - i.paid_total) + i.overdue_interest, 0);
  const pendingCommission = commPending.reduce((s, c) => s + c.commission_amount, 0);
  const netPayout = billingPaid - pendingCommission;
  const totalUnits = new Set(leases.map((l) => l.unit?.id).filter(Boolean)).size;
  const expiringCount = activeLeases.filter((l) => isExpiringSoon(new Date(l.end_date), 60)).length;

  return {
    leases,
    activeLeases,
    overdueInvoices: invOverdue,
    billingTotal,
    billingPaid,
    collectionRate,
    overdueOutstanding,
    pendingCommission,
    netPayout,
    totalUnits,
    expiringCount,
  };
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  draft: { l: "초안", c: "bg-slate-100 text-slate-700" },
  active: { l: "진행중", c: "bg-green-100 text-green-800" },
  expiring: { l: "만료임박", c: "bg-amber-100 text-amber-800" },
  renewed: { l: "갱신", c: "bg-blue-100 text-blue-800" },
  terminated: { l: "해지", c: "bg-red-100 text-red-700" },
  expired: { l: "만료", c: "bg-slate-100 text-slate-500" },
};

export default async function LandlordDashboard() {
  let landlord: { id: string; name: string };
  try {
    const ctx = await requireLandlord();
    landlord = ctx.landlord;
  } catch (e) {
    if (e instanceof AppError && e.code === "FORBIDDEN") {
      redirect("/landlord/login?error=not_landlord");
    }
    redirect("/landlord/login");
  }

  const data = await fetchLandlordData(landlord.id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-primary">{landlord.name} 임대인님</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">내 자산 대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">활성 계약 {data.activeLeases.length}건 · 총 호실 {data.totalUnits}개</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/landlord/reports">월간 보고서</Link>
          </Button>
          <LandlordLogoutButton />
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-slate-700 bg-slate-100">
              <Wallet className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold tabular-nums">{formatWonMan(data.billingTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">이번달 청구</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-green-700 bg-green-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold tabular-nums">{data.collectionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">수금률 ({formatWonMan(data.billingPaid)})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-red-700 bg-red-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold tabular-nums">{formatWonMan(data.overdueOutstanding)}</p>
            <p className="text-xs text-muted-foreground mt-1">연체 미수 ({data.overdueInvoices.length}건)</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-primary bg-white">
              <Wallet className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold tabular-nums text-primary">{formatWonMan(data.netPayout)}</p>
            <p className="text-xs text-muted-foreground mt-1">예상 실수령액 (수수료 차감)</p>
          </CardContent>
        </Card>
      </div>

      {/* 만료 임박 alert */}
      {data.expiringCount > 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="pt-5 pb-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <div>
                <p className="font-bold text-amber-900">계약 만료 임박</p>
                <p className="text-sm text-amber-800">60일 이내 만료 예정 {data.expiringCount}건. 갱신 여부를 결정해 주세요.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/landlord/properties">자세히 보기</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 연체 alert */}
      {data.overdueInvoices.length > 0 && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="pt-5 pb-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-700" />
              <div>
                <p className="font-bold text-red-900">미납 발생</p>
                <p className="text-sm text-red-800">{data.overdueInvoices.length}건 · {formatWonSuffix(data.overdueOutstanding)} 미수. 관리실에서 징수 진행 중입니다.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={COMPANY.contact.phoneHref}><Phone className="h-3.5 w-3.5 mr-1" /> 관리실 통화</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 계약 목록 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">내 계약 ({data.leases.length})</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/landlord/properties">전체 <ArrowRight className="h-3 w-3 ml-0.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.leases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">아직 등록된 계약이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>건물·호실</TableHead>
                  <TableHead>임차인</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="w-[100px]">월세</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leases.slice(0, 10).map((l) => {
                  const cfg = STATUS_LABEL[l.status] ?? STATUS_LABEL.draft;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">
                        <div className="font-medium">{l.unit?.property?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.unit?.unit_no}호</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{l.tenant?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.tenant?.phone ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatKoreanDate(l.start_date)}
                        <br />~ {formatKoreanDate(l.end_date)}
                      </TableCell>
                      <TableCell className="text-sm">{formatWonMan(l.rent_amount)}</TableCell>
                      <TableCell>
                        <Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        <Button asChild className="h-auto py-4">
          <Link href="/landlord/payments">
            <span className="text-left">
              <div className="font-semibold">월별 정산 내역</div>
              <div className="text-xs opacity-80 mt-0.5">입금·수수료·실수령액</div>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/landlord/reports">
            <FileText className="h-4 w-4 mr-2" />
            <span className="text-left">
              <div className="font-semibold">월간 보고서 PDF</div>
              <div className="text-xs opacity-80 mt-0.5">매월 자동 생성</div>
            </span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
