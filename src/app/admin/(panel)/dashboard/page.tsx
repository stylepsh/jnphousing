import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquareWarning, Wrench, FileQuestion, Home, ArrowRight, Wallet, CheckCircle2, AlertTriangle, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatWonMan } from "@/lib/money";
import { formatKoreanDate, monthRange } from "@/lib/dates";
import type { Complaint, Inquiry } from "@/types/database";
import type { RentInvoice, AgencyCommission, Lease } from "@/types/lease";

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS", facility: "시설", noise: "소음", complaint: "민원", etc: "기타",
};
const STATUS_LABEL: Record<string, string> = {
  received: "접수", in_progress: "처리중", resolved: "완료", closed: "종결",
};

async function getDashboardData() {
  const supabase = await createClient();
  const now = new Date();
  const { start, end } = monthRange(now);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  const exp60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    receivedRes, inProgressRes, newInquiriesRes, vacantRes,
    invThisMonthRes, overdueRes,
    pendingCommissionsRes,
    expiringLeasesRes,
    recentComplaintsRes, recentInquiriesRes,
  ] = await Promise.all([
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "received"),
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "available").eq("is_published", true),
    supabase.from("rent_invoices").select("amount_total, paid_total, status").gte("due_date", startIso).lte("due_date", endIso),
    supabase.from("rent_invoices").select("amount_total, paid_total").eq("status", "overdue"),
    supabase.from("agency_commissions").select("commission_amount").eq("status", "pending"),
    supabase.from("leases").select("id, end_date, lease_type, unit_id").in("status", ["active", "expiring"]).lte("end_date", exp60).order("end_date").limit(10),
    supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const invs = (invThisMonthRes.data ?? []) as Pick<RentInvoice, "amount_total" | "paid_total" | "status">[];
  const billingTotal = invs.reduce((s, i) => s + i.amount_total, 0);
  const billingPaid = invs.reduce((s, i) => s + i.paid_total, 0);
  const collectionRate = billingTotal > 0 ? Math.floor((billingPaid * 100) / billingTotal) : 0;
  const overdues = (overdueRes.data ?? []) as Pick<RentInvoice, "amount_total" | "paid_total">[];
  const overdueOutstanding = overdues.reduce((s, i) => s + Math.max(0, i.amount_total - i.paid_total), 0);
  const pendingComm = ((pendingCommissionsRes.data ?? []) as Pick<AgencyCommission, "commission_amount">[]).reduce((s, c) => s + c.commission_amount, 0);

  return {
    received: receivedRes.count ?? 0,
    inProgress: inProgressRes.count ?? 0,
    newInquiries: newInquiriesRes.count ?? 0,
    vacant: vacantRes.count ?? 0,
    billingTotal,
    billingPaid,
    collectionRate,
    overdueOutstanding,
    pendingComm,
    expiringLeases: (expiringLeasesRes.data ?? []) as Pick<Lease, "id" | "end_date" | "lease_type" | "unit_id">[],
    recentComplaints: (recentComplaintsRes.data ?? []) as Complaint[],
    recentInquiries: (recentInquiriesRes.data ?? []) as Inquiry[],
  };
}

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">대시보드</h1>
      <p className="mt-1 text-sm text-muted-foreground">현재 운영 현황을 확인하세요.</p>

      {/* 운영 KPI */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">운영</p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard label="신규 민원" value={String(d.received)} icon={MessageSquareWarning} color="text-red-600 bg-red-50" href="/admin/complaints?status=received" />
          <KpiCard label="처리중 민원" value={String(d.inProgress)} icon={Wrench} color="text-amber-600 bg-amber-50" href="/admin/complaints?status=in_progress" />
          <KpiCard label="신규 관리문의" value={String(d.newInquiries)} icon={FileQuestion} color="text-blue-600 bg-blue-50" href="/admin/inquiries?status=new" />
          <KpiCard label="공실 매물" value={String(d.vacant)} icon={Home} color="text-green-600 bg-green-50" href="/admin/vacancies" />
        </div>
      </div>

      {/* 월세 KPI */}
      <div className="mt-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">월세 · 수수료</p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard label="이번달 청구액" value={formatWonMan(d.billingTotal)} icon={Wallet} color="text-slate-700 bg-slate-100" href="/admin/rent" />
          <KpiCard label="수금률" value={`${d.collectionRate}%`} icon={CheckCircle2} color="text-green-600 bg-green-50" href="/admin/rent" />
          <KpiCard label="연체 미수" value={formatWonMan(d.overdueOutstanding)} icon={AlertTriangle} color="text-red-600 bg-red-50" href="/admin/rent" />
          <KpiCard label="수수료 정산대기" value={formatWonMan(d.pendingComm)} icon={Wallet} color="text-blue-600 bg-blue-50" href="/admin/commissions" />
        </div>
      </div>

      {/* 만료 임박 + 최근 활동 */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">만료 임박 계약 (60일)</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/leases?status=expiring">전체 <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.expiringLeases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">임박 계약이 없습니다.</p>
            ) : (
              d.expiringLeases.map((l) => (
                <Link key={l.id} href={`/admin/leases/${l.id}`} className="block p-2.5 rounded hover:bg-muted/40">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <FileSignature className="h-3.5 w-3.5 text-muted-foreground" />
                      {l.lease_type === "long_term" ? "장기" : "단기"} 계약
                    </span>
                    <Badge variant="outline" className="text-xs">{formatKoreanDate(l.end_date)}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 민원</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/complaints">전체 <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.recentComplaints.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">접수된 민원이 없습니다.</p>
            ) : (
              d.recentComplaints.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.building_name} · {c.unit_number}호 · {CATEGORY_LABEL[c.category]}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-xs">{STATUS_LABEL[c.status]}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(c.created_at), "MM.dd HH:mm", { locale: ko })}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 관리문의</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/inquiries">전체 <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.recentInquiries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">접수된 문의가 없습니다.</p>
            ) : (
              d.recentInquiries.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{q.contact_name} ({q.company_name ?? "-"})</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{q.building_address}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(q.created_at), "MM.dd HH:mm", { locale: ko })}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, color, href,
}: {
  label: string; value: string;
  icon: React.ComponentType<{ className?: string }>; color: string; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5 pb-5">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
