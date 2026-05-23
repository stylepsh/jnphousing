import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWonSuffix, formatWonMan } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import { LeaseActions } from "./lease-actions";
import type { Lease, Landlord, Tenant, PropertyUnit, LeaseEvent, RentInvoice, RentSchedule } from "@/types/lease";

async function fetchAll(id: string) {
  const supabase = await createClient();
  const [lRes, evRes, schRes, invRes] = await Promise.all([
    supabase.from("leases").select("*, unit:properties_units(*, properties(name, address)), landlord:landlords(name, phone), tenant:tenants(name, phone)").eq("id", id).maybeSingle(),
    supabase.from("lease_events").select("*").eq("lease_id", id).order("event_date", { ascending: false }).limit(50),
    supabase.from("rent_schedules").select("*").eq("lease_id", id).order("due_date"),
    supabase.from("rent_invoices").select("*").eq("lease_id", id).order("due_date"),
  ]);
  return {
    lease: lRes.data as unknown as (Lease & {
      unit: (PropertyUnit & { properties: { name: string; address: string } | null }) | null;
      landlord: Pick<Landlord, "name" | "phone"> | null;
      tenant: Pick<Tenant, "name" | "phone"> | null;
    }) | null,
    events: (evRes.data ?? []) as LeaseEvent[],
    schedules: (schRes.data ?? []) as RentSchedule[],
    invoices: (invRes.data ?? []) as RentInvoice[],
  };
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  draft:      { l: "초안", c: "bg-slate-200 text-slate-700" },
  active:     { l: "진행중", c: "bg-green-100 text-green-800" },
  expiring:   { l: "만료임박", c: "bg-amber-100 text-amber-800" },
  renewed:    { l: "갱신", c: "bg-blue-100 text-blue-800" },
  terminated: { l: "해지", c: "bg-red-100 text-red-700" },
  expired:    { l: "만료", c: "bg-slate-100 text-slate-500" },
};

const EVENT_LABEL: Record<string, string> = {
  created: "계약 생성",
  activated: "활성화",
  renewed: "갱신",
  terminated: "해지",
  expired: "만료",
  notice_sent: "알림 발송",
  overdue: "연체 전이",
  payment_received: "입금",
  schedule_generated: "스케줄 생성",
  invoice_issued: "청구서 발행",
  commission_generated: "수수료 정산",
};

const INVOICE_STATUS_LABEL: Record<string, { l: string; c: string }> = {
  unpaid:   { l: "미납", c: "bg-blue-100 text-blue-800" },
  partial:  { l: "부분납", c: "bg-amber-100 text-amber-800" },
  paid:     { l: "완납", c: "bg-green-100 text-green-800" },
  overdue:  { l: "연체", c: "bg-red-100 text-red-700" },
  waived:   { l: "면제", c: "bg-slate-100 text-slate-700" },
};

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { lease, events, schedules, invoices } = await fetchAll(id);
  if (!lease) notFound();
  const cfg = STATUS_LABEL[lease.status] ?? STATUS_LABEL.draft;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/leases"><ArrowLeft className="h-4 w-4 mr-1" /> 계약 목록</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${cfg.c} hover:${cfg.c}`}>{cfg.l}</Badge>
            <Badge variant="outline">{lease.lease_type === "long_term" ? "장기" : "단기"}</Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {lease.unit?.properties?.name} · {lease.unit?.unit_no}호
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{lease.unit?.properties?.address}</p>
        </div>
        <LeaseActions lease={lease} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">계약 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Row label="임대인" value={`${lease.landlord?.name} (${lease.landlord?.phone})`} />
            <Row label="임차인" value={`${lease.tenant?.name} (${lease.tenant?.phone})`} />
            <Row label="기간" value={`${formatKoreanDate(lease.start_date)} ~ ${formatKoreanDate(lease.end_date)}`} />
            <Row label="보증금" value={formatWonSuffix(lease.deposit)} />
            <Row label="월세" value={formatWonSuffix(lease.rent_amount)} />
            <Row label="관리비" value={formatWonSuffix(lease.management_fee)} />
            <Row label="청구 주기" value={`${lease.rent_cycle}${lease.rent_day ? ` · 매월 ${lease.rent_day}일` : ""}`} />
            <Row label="부가세" value={lease.vat_included ? "별도 청구" : "포함" } />
            <Row label="수수료" value={lease.fee_type === "percent" ? `비율 ${lease.fee_percent}%` : `정액 ${formatWonSuffix(lease.fee_fixed ?? 0)}`} />
            <Row label="연체이율" value={`연 ${lease.overdue_annual_rate}%`} />
          </CardContent>
        </Card>

        {/* 이벤트 타임라인 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">이벤트 타임라인 (최근 50건)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">기록된 이벤트가 없습니다.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                  <Badge variant="outline" className="text-xs shrink-0">{EVENT_LABEL[e.event_type] ?? e.event_type}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">{formatKoreanDate(e.event_date.slice(0, 10))} {e.event_date.slice(11, 16)}</div>
                    {Object.keys(e.payload ?? {}).length > 0 && (
                      <pre className="mt-1 text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1 overflow-x-auto">
                        {JSON.stringify(e.payload, null, 0)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 청구 스케줄 + 청구서 */}
      <div className="mt-6 grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">청구 스케줄 ({schedules.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">활성화 시 자동 생성됩니다.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>청구일</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>일할</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.slice(0, 20).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{formatKoreanDate(s.due_date)}</TableCell>
                      <TableCell className="text-sm">{formatWonMan(s.amount_total)}</TableCell>
                      <TableCell className="text-xs">{s.prorated ? "일할" : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">발행 청구서 ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">아직 발행된 청구서가 없습니다.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>마감일</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>납부</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 20).map((i) => {
                    const ic = INVOICE_STATUS_LABEL[i.status] ?? INVOICE_STATUS_LABEL.unpaid;
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="text-sm">{formatKoreanDate(i.due_date)}</TableCell>
                        <TableCell className="text-sm">{formatWonMan(i.amount_total)}</TableCell>
                        <TableCell className="text-sm">{formatWonMan(i.paid_total)}</TableCell>
                        <TableCell><Badge className={`${ic.c} hover:${ic.c} text-xs`}>{ic.l}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
