import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquareWarning, Wrench, FileQuestion, Home, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Complaint, Inquiry } from "@/types/database";

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS",
  facility: "시설",
  noise: "소음",
  complaint: "민원",
  etc: "기타",
};

const STATUS_LABEL: Record<string, string> = {
  received: "접수",
  in_progress: "처리중",
  resolved: "완료",
  closed: "종결",
};

async function getKPI() {
  const supabase = await createClient();
  const [received, inProgress, newInquiries, vacant] = await Promise.all([
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "received"),
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "available").eq("is_published", true),
  ]);
  return {
    received: received.count ?? 0,
    inProgress: inProgress.count ?? 0,
    newInquiries: newInquiries.count ?? 0,
    vacant: vacant.count ?? 0,
  };
}

async function getRecent() {
  const supabase = await createClient();
  const [complaintsRes, inquiriesRes] = await Promise.all([
    supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(5),
  ]);
  return {
    complaints: (complaintsRes.data ?? []) as Complaint[],
    inquiries: (inquiriesRes.data ?? []) as Inquiry[],
  };
}

export default async function DashboardPage() {
  const kpi = await getKPI();
  const recent = await getRecent();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">대시보드</h1>
      <p className="mt-1 text-sm text-muted-foreground">현재 운영 현황을 확인하세요.</p>

      <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="신규 민원" value={kpi.received} icon={MessageSquareWarning} color="text-red-600 bg-red-50" href="/admin/complaints?status=received" />
        <KpiCard label="처리중 민원" value={kpi.inProgress} icon={Wrench} color="text-amber-600 bg-amber-50" href="/admin/complaints?status=in_progress" />
        <KpiCard label="신규 관리문의" value={kpi.newInquiries} icon={FileQuestion} color="text-blue-600 bg-blue-50" href="/admin/inquiries?status=new" />
        <KpiCard label="공실 매물" value={kpi.vacant} icon={Home} color="text-green-600 bg-green-50" href="/admin/vacancies" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 민원</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/complaints">전체 <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">접수된 민원이 없습니다.</p>
            ) : (
              recent.complaints.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.building_name} · {c.unit_number}호 · {CATEGORY_LABEL[c.category]}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-xs">{STATUS_LABEL[c.status]}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(c.created_at), "MM.dd HH:mm", { locale: ko })}
                    </p>
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
            {recent.inquiries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">접수된 문의가 없습니다.</p>
            ) : (
              recent.inquiries.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{q.contact_name} ({q.company_name ?? "-"})</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{q.building_address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-xs">{q.status === "new" ? "신규" : q.status === "contacted" ? "응대중" : "종결"}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(q.created_at), "MM.dd HH:mm", { locale: ko })}
                    </p>
                  </div>
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
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5 pb-5">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold tabular-nums">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
