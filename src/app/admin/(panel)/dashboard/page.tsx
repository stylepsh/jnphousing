import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquareWarning, Home, ArrowRight, Wallet, AlertTriangle, FileSignature,
  Building2, UserSquare, DoorOpen, Banknote,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { formatWonMan } from "@/lib/money";
import { formatKoreanDate, monthRange } from "@/lib/dates";
import { BillingTrendChart, type BillingPoint } from "@/components/charts/BillingTrendChart";
import { OccupancyDonutChart } from "@/components/charts/OccupancyDonutChart";
import { ChannelBarChart, type ChannelPoint } from "@/components/charts/ChannelBarChart";
import type { Complaint, Inquiry } from "@/types/database";
import type { RentInvoice, AgencyCommission, Lease } from "@/types/lease";

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS", facility: "시설", noise: "소음", complaint: "민원", etc: "기타",
};
const STATUS_LABEL: Record<string, string> = {
  received: "접수", in_progress: "처리중", resolved: "완료", closed: "종결",
};

interface PipelineRow {
  owner_id: string;
  owner_name: string;
  building_count: number;
  unit_count: number;
  vacant_count: number;
  occupied_count: number;
  month_invoice_count: number;
  month_paid_count: number;
  month_overdue_count: number;
}

function emptyDashboard() {
  return {
    received: 0, inProgress: 0, newInquiries: 0, vacant: 0,
    billingTotal: 0, billingPaid: 0, collectionRate: 0,
    overdueOutstanding: 0, overdueCount: 0, awaitingCount: 0, expiringCount: 0,
    pendingComm: 0,
    ownerCount: 0, totalBuildings: 0, totalUnits: 0, totalVacant: 0, totalOccupied: 0,
    expiringLeases: [] as Pick<Lease, "id" | "end_date" | "lease_type" | "unit_id">[],
    recentComplaints: [] as Complaint[],
    recentInquiries: [] as Inquiry[],
    billingTrend: [] as BillingPoint[],
    occupancy: { occupied: 0, vacant: 0, expiring: 0 },
    channelStats: [] as ChannelPoint[],
  };
}

async function getDashboardData() {
  if (!isSupabaseConfigured()) return emptyDashboard();
  const supabase = await createClient();
  const now = new Date();
  const { start, end } = monthRange(now);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  const exp60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const sixMonthsAgo = startOfMonth(subMonths(now, 5));
  const trendStartIso = sixMonthsAgo.toISOString().slice(0, 10);
  const trendEndIso = endOfMonth(now).toISOString().slice(0, 10);

  const [
    receivedRes, inProgressRes, newInquiriesRes, vacantRes,
    invThisMonthRes, overdueRes,
    pendingCommissionsRes,
    expiringLeasesRes, expiringCountRes,
    recentComplaintsRes, recentInquiriesRes,
    trendInvRes, unitsRes, activeLeasesRes,
    channelStatsRes, channelsRes,
    pipelineRes,
  ] = await Promise.all([
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "received"),
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "available").eq("is_published", true),
    supabase.from("rent_invoices").select("amount_total, paid_total, status").gte("due_date", startIso).lte("due_date", endIso),
    supabase.from("rent_invoices").select("amount_total, paid_total").eq("status", "overdue"),
    supabase.from("agency_commissions").select("commission_amount").eq("status", "pending"),
    supabase.from("leases").select("id, end_date, lease_type, unit_id").in("status", ["active", "expiring"]).lte("end_date", exp60).order("end_date").limit(10),
    supabase.from("leases").select("*", { count: "exact", head: true }).in("status", ["active", "expiring"]).lte("end_date", exp60),
    supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("rent_invoices").select("amount_total, paid_total, due_date").gte("due_date", trendStartIso).lte("due_date", trendEndIso),
    supabase.from("properties_units").select("id"),
    supabase.from("leases").select("unit_id, end_date").in("status", ["active", "expiring"]),
    supabase.from("vacancy_ad_listings").select("channel_id, inquiry_count, status"),
    supabase.from("ad_channels").select("id, name").eq("is_active", true).order("display_order"),
    supabase.from("v_owner_pipeline").select("*"),
  ]);

  const invs = (invThisMonthRes.data ?? []) as Pick<RentInvoice, "amount_total" | "paid_total" | "status">[];
  const billingTotal = invs.reduce((s, i) => s + i.amount_total, 0);
  const billingPaid = invs.reduce((s, i) => s + i.paid_total, 0);
  const collectionRate = billingTotal > 0 ? Math.floor((billingPaid * 100) / billingTotal) : 0;
  const awaitingCount = invs.filter((i) => i.paid_total < i.amount_total).length;
  const overdues = (overdueRes.data ?? []) as Pick<RentInvoice, "amount_total" | "paid_total">[];
  const overdueOutstanding = overdues.reduce((s, i) => s + Math.max(0, i.amount_total - i.paid_total), 0);
  const overdueCount = overdues.length;
  const pendingComm = ((pendingCommissionsRes.data ?? []) as Pick<AgencyCommission, "commission_amount">[]).reduce((s, c) => s + c.commission_amount, 0);

  // ====== 6개월 트렌드 ======
  const trendInvs = (trendInvRes.data ?? []) as Pick<RentInvoice, "amount_total" | "paid_total" | "due_date">[];
  const trendMap = new Map<string, { billing: number; paid: number }>();
  for (let m = 5; m >= 0; m--) {
    const dt = subMonths(now, m);
    trendMap.set(format(dt, "yyyy-MM"), { billing: 0, paid: 0 });
  }
  for (const inv of trendInvs) {
    const entry = trendMap.get(inv.due_date.slice(0, 7));
    if (entry) { entry.billing += inv.amount_total; entry.paid += inv.paid_total; }
  }
  const billingTrend: BillingPoint[] = Array.from(trendMap.entries()).map(([k, v]) => ({
    label: k.slice(5) + "월", billing: v.billing, paid: v.paid,
  }));

  // ====== 점유율 ======
  const units = ((unitsRes.data ?? []) as { id: string }[]).map((u) => u.id);
  const activeLeases = (activeLeasesRes.data ?? []) as { unit_id: string; end_date: string }[];
  const occupiedSet = new Set(activeLeases.map((l) => l.unit_id));
  const expiringSet = new Set(activeLeases.filter((l) => new Date(l.end_date) <= new Date(exp60)).map((l) => l.unit_id));
  const occupiedCount = units.filter((id) => occupiedSet.has(id) && !expiringSet.has(id)).length;
  const expiringUnitCount = units.filter((id) => expiringSet.has(id)).length;
  const vacantCount = units.filter((id) => !occupiedSet.has(id)).length;

  // ====== 채널별 ======
  const channels = (channelsRes.data ?? []) as { id: string; name: string }[];
  const channelListings = (channelStatsRes.data ?? []) as { channel_id: string; inquiry_count: number; status: string }[];
  const channelStats: ChannelPoint[] = channels.map((ch) => {
    const items = channelListings.filter((l) => l.channel_id === ch.id);
    return {
      channel: ch.name.length > 6 ? ch.name.slice(0, 6) : ch.name,
      inquiries: items.reduce((s, i) => s + i.inquiry_count, 0),
      contracted: items.filter((i) => i.status === "contracted").length,
    };
  }).filter((c) => c.inquiries > 0 || c.contracted > 0);

  // ====== 임대인 파이프라인 (회사 전체 롤업) ======
  const pipeline = (pipelineRes.data ?? []) as PipelineRow[];
  const totalBuildings = pipeline.reduce((s, p) => s + (p.building_count ?? 0), 0);
  const totalUnits = pipeline.reduce((s, p) => s + (p.unit_count ?? 0), 0);
  const totalVacant = pipeline.reduce((s, p) => s + (p.vacant_count ?? 0), 0);
  const totalOccupied = pipeline.reduce((s, p) => s + (p.occupied_count ?? 0), 0);

  return {
    received: receivedRes.count ?? 0,
    inProgress: inProgressRes.count ?? 0,
    newInquiries: newInquiriesRes.count ?? 0,
    vacant: vacantRes.count ?? 0,
    billingTotal, billingPaid, collectionRate,
    overdueOutstanding, overdueCount, awaitingCount,
    expiringCount: expiringCountRes.count ?? 0,
    pendingComm,
    ownerCount: pipeline.length,
    totalBuildings, totalUnits, totalVacant, totalOccupied,
    expiringLeases: (expiringLeasesRes.data ?? []) as Pick<Lease, "id" | "end_date" | "lease_type" | "unit_id">[],
    recentComplaints: (recentComplaintsRes.data ?? []) as Complaint[],
    recentInquiries: (recentInquiriesRes.data ?? []) as Inquiry[],
    billingTrend,
    occupancy: { occupied: occupiedCount, vacant: vacantCount, expiring: expiringUnitCount },
    channelStats,
  };
}

async function getCurrentAdmin() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("admin_users").select("name, role").eq("user_id", user.id).maybeSingle();
    return data as { name: string; role: string } | null;
  } catch {
    return null;
  }
}

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  super:    { label: "최고 관리자", color: "bg-purple-100 text-purple-700 border-purple-200" },
  staff:    { label: "일반 직원",   color: "bg-blue-100 text-blue-700 border-blue-200" },
  readonly: { label: "조회 전용",   color: "bg-slate-100 text-slate-600 border-slate-200" },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "늦은 시간 수고 많으십니다";
  if (h < 12) return "좋은 아침입니다";
  if (h < 18) return "수고 많으십니다";
  return "오늘도 고생하셨습니다";
}

export default async function DashboardPage() {
  const [d, admin] = await Promise.all([getDashboardData(), getCurrentAdmin()]);
  const adminName = admin?.name ?? "관리자";
  const roleInfo = ROLE_LABEL[admin?.role ?? "staff"] ?? ROLE_LABEL.staff;
  const today = new Date();
  const unhandled = d.received + d.inProgress + d.newInquiries;
  const todoTotal = d.overdueCount + d.awaitingCount + d.expiringCount + unhandled;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* 환영 헤더 */}
      <div className="rounded-2xl bg-gradient-to-br from-primary via-primary to-slate-800 text-white p-6 md:p-7 mb-6 shadow-lg shadow-primary/20 relative overflow-hidden animate-fade-in">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_25%,rgba(49,130,246,0.35),transparent_55%)] animate-gradient" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${roleInfo.color} border-0`}>{roleInfo.label}</Badge>
              <span className="text-xs text-blue-100">
                {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{adminName}님, {getGreeting()} 👋</h1>
            <p className="mt-1.5 text-sm text-blue-100">
              {todoTotal > 0
                ? <>오늘 처리할 일이 <span className="font-bold text-white">{todoTotal}건</span> 있습니다.</>
                : "오늘 급히 처리할 일은 없습니다. 👍"}
            </p>
          </div>
        </div>
      </div>

      {/* ① 오늘 처리할 일 — 액션 중심 (0건은 회색) */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">오늘 처리할 일</p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <ActionCard label="연체" count={d.overdueCount} sub={d.overdueOutstanding > 0 ? formatWonMan(d.overdueOutstanding) : undefined}
            icon={AlertTriangle} tone="red" href="/admin/rent?filter=overdue" />
          <ActionCard label="입금 대기" count={d.awaitingCount}
            icon={Banknote} tone="blue" href="/admin/rent/match" />
          <ActionCard label="만료 임박 계약" count={d.expiringCount}
            icon={FileSignature} tone="amber" href="/admin/leases?status=expiring" />
          <ActionCard label="미처리 민원·문의" count={unhandled}
            icon={MessageSquareWarning} tone="rose" href="/admin/complaints" />
        </div>
      </section>

      {/* ② 임대인 파이프라인 (회사 전체 롤업) */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">임대인 파이프라인</p>
          <Button asChild variant="ghost" size="sm"><Link href="/admin/owners">임대인별 보기 <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
          <StatTile label="임대인" value={String(d.ownerCount)} icon={UserSquare} href="/admin/owners" />
          <StatTile label="건물" value={String(d.totalBuildings)} icon={Building2} href="/admin/properties" />
          <StatTile label="호실" value={String(d.totalUnits)} icon={DoorOpen} href="/admin/units/board" />
          <StatTile label="공실" value={String(d.totalVacant)} icon={Home} href="/admin/vacancies" tone={d.totalVacant > 0 ? "amber" : undefined} />
          <StatTile label="임차중" value={String(d.totalOccupied)} icon={Home} />
          <StatTile label="이번달 수금률" value={`${d.collectionRate}%`} icon={Wallet} href="/admin/rent"
            tone={d.billingTotal > 0 && d.collectionRate < 100 ? "amber" : undefined} />
        </div>
      </section>

      {/* ③ 통계 (강등) — 6개월 트렌드 + 점유율 */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">📈 월별 청구·수금 추이 (최근 6개월)</CardTitle></CardHeader>
          <CardContent><BillingTrendChart data={d.billingTrend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">🏘️ 호실 점유율</CardTitle></CardHeader>
          <CardContent><OccupancyDonutChart occupied={d.occupancy.occupied} vacant={d.occupancy.vacant} expiring={d.occupancy.expiring} /></CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader><CardTitle className="text-base">📢 광고 채널별 문의·계약 (피터팬·삼삼엠투·직방 등)</CardTitle></CardHeader>
          <CardContent><ChannelBarChart data={d.channelStats} /></CardContent>
        </Card>
      </div>

      {/* ④ 최근 활동 */}
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
                    <p className="text-xs text-muted-foreground mt-0.5">{c.building_name} · {c.unit_number}호 · {CATEGORY_LABEL[c.category]}</p>
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

// 오늘 할 일 — 0건은 회색(비강조), 1건↑는 톤 강조
function ActionCard({
  label, count, sub, icon: Icon, tone, href,
}: {
  label: string; count: number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; tone: "red" | "blue" | "amber" | "rose"; href: string;
}) {
  const zero = count === 0;
  const toneCls: Record<string, string> = {
    red: "border-red-200 bg-red-50/60", blue: "border-blue-200 bg-blue-50/60",
    amber: "border-amber-200 bg-amber-50/60", rose: "border-rose-200 bg-rose-50/60",
  };
  const iconCls: Record<string, string> = {
    red: "text-red-600 bg-red-100", blue: "text-blue-600 bg-blue-100",
    amber: "text-amber-600 bg-amber-100", rose: "text-rose-600 bg-rose-100",
  };
  return (
    <Link href={href}>
      <Card className={`transition-shadow hover:shadow-md ${zero ? "opacity-60 border-border" : toneCls[tone]}`}>
        <CardContent className="pt-5 pb-5">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${zero ? "text-slate-400 bg-slate-100" : iconCls[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${zero ? "text-slate-400" : ""}`}>{count}<span className="text-sm font-medium ml-0.5">건</span></p>
          <p className="text-xs text-muted-foreground mt-1">{label}{sub ? ` · ${sub}` : ""}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// 파이프라인 통계 타일
function StatTile({
  label, value, icon: Icon, href, tone,
}: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; href?: string; tone?: "amber";
}) {
  const inner = (
    <Card className={`transition-shadow ${href ? "hover:shadow-md" : ""} ${tone === "amber" ? "border-amber-200" : ""}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-xl font-bold tabular-nums ${tone === "amber" ? "text-amber-700" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
