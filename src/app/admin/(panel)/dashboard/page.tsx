import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquareWarning, Home, ArrowRight, Wallet, AlertTriangle, FileSignature,
  Building2, UserSquare, DoorOpen, Download, PhoneCall, DoorClosed, FileSpreadsheet, ListTodo,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatWonMan } from "@/lib/money";
import { BillingTrendChart, type BillingPoint } from "@/components/charts/BillingTrendChart";
import { OccupancyDonutChart } from "@/components/charts/OccupancyDonutChart";
import { ChannelBarChart, type ChannelPoint } from "@/components/charts/ChannelBarChart";
import type { Complaint, Inquiry } from "@/types/database";
import { loadSheetSnapshot, sheetConfigured, todayKst } from "@/lib/sheet/source";
import { loadOtherTabs } from "@/lib/sheet/ledgers";
import { unitHref } from "@/lib/sheet/links";
import type { SheetUnit } from "@/lib/sheet/all-parser";
import { TodoWidget, type TodoWidgetRow } from "./todo-widget";

/**
 * 대시보드 — 임대·수금·공실 숫자는 경리 구글 시트(ALL·퇴실정산 탭)에서, 민원·문의·할 일·광고 채널은 DB에서.
 * (예전 DB 사본 기준 연체·수금률·점유율은 시트와 달라져서 시트 기준으로 바꿨다)
 */

const CATEGORY_LABEL: Record<string, string> = { as: "AS", facility: "시설", noise: "소음", complaint: "민원", etc: "기타" };
const STATUS_LABEL: Record<string, string> = { received: "접수", in_progress: "처리중", resolved: "완료", closed: "종결" };
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1PNvD5jTyWqE3N-Y2Fm1oyNGwXBlzmPyBbjjgcWOyMiM/edit";
const FORCED_RE = /문개방|강제개방|강재개방|강제개문|도어교체|단전단수/;

async function getDbData() {
  const empty = {
    degraded: false, received: 0, inProgress: 0, newInquiries: 0,
    recentComplaints: [] as Complaint[], recentInquiries: [] as Inquiry[],
    channelStats: [] as ChannelPoint[], openTodos: [] as TodoWidgetRow[], openTodoCount: 0,
  };
  if (!isSupabaseConfigured()) return empty;
  const supabase = await createClient();
  const [receivedRes, inProgressRes, newInquiriesRes, recentComplaintsRes, recentInquiriesRes, channelStatsRes, channelsRes, todosRes] = await Promise.all([
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "received"),
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("vacancy_ad_listings").select("channel_id, inquiry_count, status"),
    supabase.from("ad_channels").select("id, name").eq("is_active", true).order("display_order"),
    supabase.from("team_todos").select("id, title, assignee, due_date", { count: "exact" })
      .in("status", ["todo", "delayed"]).order("due_date", { ascending: true, nullsFirst: false }).limit(5),
  ]);
  const all = [receivedRes, inProgressRes, newInquiriesRes, recentComplaintsRes, recentInquiriesRes, channelStatsRes, channelsRes, todosRes];

  const channels = (channelsRes.data ?? []) as { id: string; name: string }[];
  const listings = (channelStatsRes.data ?? []) as { channel_id: string; inquiry_count: number; status: string }[];
  const channelStats: ChannelPoint[] = channels.map((ch) => {
    const items = listings.filter((l) => l.channel_id === ch.id);
    return {
      channel: ch.name.length > 6 ? ch.name.slice(0, 6) : ch.name,
      inquiries: items.reduce((s, i) => s + i.inquiry_count, 0),
      contracted: items.filter((i) => i.status === "contracted").length,
    };
  }).filter((c) => c.inquiries > 0 || c.contracted > 0);

  return {
    degraded: all.some((r) => Boolean(r.error)),
    received: receivedRes.count ?? 0,
    inProgress: inProgressRes.count ?? 0,
    newInquiries: newInquiriesRes.count ?? 0,
    recentComplaints: (recentComplaintsRes.data ?? []) as Complaint[],
    recentInquiries: (recentInquiriesRes.data ?? []) as Inquiry[],
    channelStats,
    openTodos: (todosRes.data ?? []) as TodoWidgetRow[],
    openTodoCount: todosRes.count ?? 0,
  };
}

const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const daysTo = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400_000);

async function getSheetData() {
  if (!sheetConfigured()) return { error: "구글 시트 연결 전입니다." };
  try {
    const [snap, other] = await Promise.all([loadSheetSnapshot(), loadOtherTabs()]);
    const today = todayKst();
    const curYm = today.slice(0, 7);
    const units = snap.units;
    const occ = units.filter((u) => u.status === "입주");
    const arrears = occ
      .filter((u) => u.unpaidAmount > 0)
      .sort((a, b) => b.unpaidMonths.length - a.unpaidMonths.length || b.unpaidAmount - a.unpaidAmount);
    const forced = occ.filter((u) => u.movedOut || FORCED_RE.test(`${u.memo} ${u.note}`));
    const expiring = occ
      .filter((u) => u.expiry && u.expiry >= today && daysTo(today, u.expiry) <= 60)
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
    const vacant = units.filter((u) => u.status === "상품");
    const moveOutPending = typeof other.moveOuts === "string" ? null : other.moveOuts.filter((m) => m.pending).length;

    // 최근 6개월: 받아야 했던 월세(납부일이 지난 입금·미납 칸) vs 실제 입금
    const trend: BillingPoint[] = [];
    for (let k = 5; k >= 0; k--) {
      const ym = addMonths(curYm, -k);
      let billing = 0, paid = 0;
      for (const u of occ) {
        const m = u.months.find((x) => x.ym === ym);
        if (!m) continue;
        if (m.state === "paid") { paid += m.amount ?? 0; billing += Math.max(u.rent, m.amount ?? 0); }
        else if (m.state === "unpaid") billing += u.rent;
      }
      trend.push({ label: `${Number(ym.slice(5))}월`, billing, paid });
    }
    const prev = trend[trend.length - 2];

    return {
      sheetDate: snap.sheetDate,
      landlords: new Set(units.map((u) => u.landlord).filter(Boolean)).size,
      buildings: new Set(units.filter((u) => u.status !== "종결").map((u) => `${u.landlord}|${u.building}`)).size,
      liveUnits: units.filter((u) => u.status !== "종결").length,
      occupied: occ.length,
      vacant: vacant.length,
      arrears,
      arrearsAmount: arrears.reduce((s, u) => s + u.unpaidAmount, 0),
      forced: forced.length,
      expiring,
      moveOutPending,
      trend,
      prevRate: prev && prev.billing > 0 ? Math.floor((prev.paid * 100) / prev.billing) : 0,
      prevLabel: prev?.label ?? "",
      occupancy: { occupied: occ.length - expiring.length, vacant: vacant.length, expiring: expiring.length },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
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
  super: { label: "최고 관리자", color: "bg-purple-100 text-purple-700 border-purple-200" },
  staff: { label: "일반 직원", color: "bg-blue-100 text-blue-700 border-blue-200" },
  readonly: { label: "조회 전용", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

function getGreeting(): string {
  const h = Number(new Date(Date.now() + 9 * 3600_000).toISOString().slice(11, 13));
  if (h < 6) return "늦은 시간 수고 많으십니다";
  if (h < 12) return "좋은 아침입니다";
  if (h < 18) return "수고 많으십니다";
  return "오늘도 고생하셨습니다";
}

export default async function DashboardPage() {
  const [d, s, admin] = await Promise.all([getDbData(), getSheetData(), getCurrentAdmin()]);
  const adminName = admin?.name ?? "관리자";
  const roleInfo = ROLE_LABEL[admin?.role ?? "staff"] ?? ROLE_LABEL.staff;
  const today = todayKst();
  const unhandled = d.received + d.inProgress + d.newInquiries;
  const sheet = "error" in s ? null : s;
  const todoTotal = (sheet ? sheet.arrears.length + (sheet.moveOutPending ?? 0) : 0) + unhandled;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="rounded-2xl bg-primary text-white p-6 md:p-7 mb-6 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${roleInfo.color} border-0`}>{roleInfo.label}</Badge>
              <span className="text-xs text-blue-100">{format(new Date(`${today}T00:00:00`), "yyyy년 M월 d일 EEEE", { locale: ko })}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{adminName}님, {getGreeting()} 👋</h1>
            <p className="mt-1.5 text-sm text-blue-100">
              {todoTotal > 0 ? <>챙길 일이 <span className="font-bold text-white">{todoTotal}건</span> 있습니다.</> : "오늘 급히 처리할 일은 없습니다. 👍"}
              {sheet && <> · 경리 시트 기준일 {sheet.sheetDate}</>}
            </p>
          </div>
          <a href={SHEET_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3.5 py-2 text-sm font-semibold border border-white/20 transition">
            <FileSpreadsheet className="h-4 w-4" /> 경리 시트 열기
          </a>
        </div>
      </div>

      {(d.degraded || !sheet) && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {"error" in s && <p className="font-semibold">경리 시트를 읽지 못했습니다: {s.error}</p>}
            {d.degraded && <p className="font-semibold">민원·문의·할 일 일부를 불러오지 못했습니다.</p>}
          </div>
        </div>
      )}

      <section className="mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">바로 가기</p>
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <QuickLink label="전화할 곳" icon={PhoneCall} href="/admin/rent-board" />
          <QuickLink label="공실·문개방" icon={DoorClosed} href="/admin/rent-board" />
          <QuickLink label="임대인·장부" icon={UserSquare} href="/admin/landlord-board" />
          <QuickLink label="월 보고서" icon={Wallet} href="/admin/settle-board?tab=report" />
          <QuickLink label="퇴실정산" icon={FileSignature} href="/admin/settle-board?tab=moveout" />
          <QuickLink label="할 일" icon={ListTodo} href="/admin/todos" />
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          오늘 챙길 일 <span className="normal-case font-normal">· 시트 기준 {today}</span>
        </p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <ActionCard label="월세 미납 세대" count={sheet?.arrears.length ?? 0} sub={sheet?.arrearsAmount ? formatWonMan(sheet.arrearsAmount) : undefined}
            icon={AlertTriangle} tone="red" href="/admin/rent-board" />
          <ActionCard label="퇴실정산 미정산" count={sheet?.moveOutPending ?? 0} icon={FileSignature} tone="amber" href="/admin/settle-board?tab=moveout" />
          <ActionCard label="60일 안에 만기" count={sheet?.expiring.length ?? 0} icon={DoorOpen} tone="blue" href="/admin/rent-board" />
          <ActionCard label="미처리 민원·문의" count={unhandled} icon={MessageSquareWarning} tone="rose" href="/admin/complaints" />
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">📞 전화할 곳 (미납 많은 순)</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/rent-board">전체 <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {!sheet || sheet.arrears.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">미납 세대가 없습니다.</p>
            ) : (
              sheet.arrears.slice(0, 8).map((u: SheetUnit) => (
                <Link key={u.key} href={unitHref(u.key)} className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-muted/40 text-sm">
                  <span className="truncate"><b>{u.building} {u.unit}</b> {u.tenant}</span>
                  <span className="shrink-0 tabular-nums text-red-700 font-semibold">
                    {u.unpaidMonths.length ? `${u.unpaidMonths.length}개월` : "차액"} · {formatWonMan(u.unpaidAmount)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <TodoWidget rows={d.openTodos} totalOpen={d.openTodoCount} todayIso={today} />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            전체 현황 <span className="normal-case font-normal">· 경리 시트 ALL 탭</span>
          </p>
          <Button asChild variant="ghost" size="sm"><Link href="/admin/landlord-board">임대인별 보기 <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
          <StatTile label="임대인" value={String(sheet?.landlords ?? "-")} icon={UserSquare} href="/admin/landlord-board" />
          <StatTile label="건물" value={String(sheet?.buildings ?? "-")} icon={Building2} href="/admin/landlord-board" />
          <StatTile label="호실 (종결 제외)" value={String(sheet?.liveUnits ?? "-")} icon={DoorOpen} href="/admin/rent-board" />
          <StatTile label="공실(상품)" value={String(sheet?.vacant ?? "-")} icon={Home} href="/admin/rent-board" tone={sheet?.vacant ? "amber" : undefined} />
          <StatTile label="입주" value={String(sheet?.occupied ?? "-")} icon={Home} />
          <StatTile label={`${sheet?.prevLabel ?? ""} 수금률`} value={sheet ? `${sheet.prevRate}%` : "-"} icon={Wallet} href="/admin/rent-board"
            tone={sheet && sheet.prevRate < 100 ? "amber" : undefined} />
        </div>
        {sheet && sheet.forced > 0 && (
          <p className="mt-2 text-xs text-red-700">강제개문·퇴거 진행 {sheet.forced}세대 — 임대 현황 &gt; 공실·문개방 탭에서 확인</p>
        )}
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">📈 월세 받을 돈 · 들어온 돈 (최근 6개월, 시트 기준)</CardTitle></CardHeader>
          <CardContent><BillingTrendChart data={sheet?.trend ?? []} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">🏘️ 호실 점유 (입주·공실·60일 내 만기)</CardTitle></CardHeader>
          <CardContent>
            <OccupancyDonutChart occupied={sheet?.occupancy.occupied ?? 0} vacant={sheet?.occupancy.vacant ?? 0} expiring={sheet?.occupancy.expiring ?? 0} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader><CardTitle className="text-base">📢 광고 채널별 문의·계약 (피터팬·삼삼엠투·직방 등)</CardTitle></CardHeader>
          <CardContent><ChannelBarChart data={d.channelStats} /></CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">60일 안에 만기 (시트)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {!sheet || sheet.expiring.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">60일 안에 만기되는 계약이 없습니다.</p>
            ) : (
              sheet.expiring.slice(0, 10).map((u: SheetUnit) => (
                <Link key={u.key} href={unitHref(u.key)} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/40 text-sm">
                  <span className="truncate"><b>{u.building} {u.unit}</b> {u.tenant}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{u.expiry} · {daysTo(today, u.expiry)}일</Badge>
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

      <p className="mt-8 text-xs text-muted-foreground">
        <Download className="inline h-3 w-3 mr-1" />
        예전 DB 기준 엑셀은 <a href="/api/admin/export/overview" className="underline">여기</a> (2단계에서 시트 기준 엑셀로 바뀝니다)
      </p>
    </div>
  );
}

function QuickLink({ label, icon: Icon, href }: { label: string; icon: React.ComponentType<{ className?: string }>; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 hover:border-primary/40 hover:shadow-md transition-all">
      <span className="h-8 w-8 rounded-lg bg-primary/[0.07] text-primary flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span>
      <span className="text-sm font-semibold text-foreground/85 group-hover:text-primary transition-colors leading-tight">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 ml-auto shrink-0 group-hover:text-primary transition-colors" />
    </Link>
  );
}

function ActionCard({ label, count, sub, icon: Icon, tone, href }: {
  label: string; count: number; sub?: string; icon: React.ComponentType<{ className?: string }>; tone: "red" | "blue" | "amber" | "rose"; href: string;
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

function StatTile({ label, value, icon: Icon, href, tone }: {
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
