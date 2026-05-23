import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminToolsButtons } from "./buttons";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "운영 도구" };

async function fetchStats() {
  const supabase = await createClient();
  const [leases, schedules, invoices, payments, notifs, audits] = await Promise.all([
    supabase.from("leases").select("*", { count: "exact", head: true }),
    supabase.from("rent_schedules").select("*", { count: "exact", head: true }),
    supabase.from("rent_invoices").select("*", { count: "exact", head: true }),
    supabase.from("rent_payments").select("*", { count: "exact", head: true }),
    supabase.from("notifications").select("*", { count: "exact", head: true }),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }),
  ]);
  return {
    leases: leases.count ?? 0,
    schedules: schedules.count ?? 0,
    invoices: invoices.count ?? 0,
    payments: payments.count ?? 0,
    notifications: notifs.count ?? 0,
    audits: audits.count ?? 0,
  };
}

export default async function AdminToolsPage() {
  const stats = await fetchStats();

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">운영 도구</h1>
      <p className="mt-1 text-sm text-muted-foreground">수동 cron 트리거 + 시스템 상태</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { l: "계약", v: stats.leases },
          { l: "스케줄", v: stats.schedules },
          { l: "청구서", v: stats.invoices },
          { l: "입금", v: stats.payments },
          { l: "알림", v: stats.notifications },
          { l: "감사 로그", v: stats.audits },
        ].map((s) => (
          <Card key={s.l}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.v.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">수동 cron 트리거</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminToolsButtons />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">자동 cron 설정 가이드</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-foreground/80">
          <p>운영 환경에서는 외부 cron 서비스에서 아래 엔드포인트를 호출합니다.</p>
          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
{`# Vercel Cron (vercel.json):
{
  "crons": [
    { "path": "/api/cron/daily",  "schedule": "0 0 * * *" },
    { "path": "/api/cron/monthly","schedule": "0 1 1 * *" }
  ]
}

# 또는 외부 (cron-job.org 등) :
GET https://your-domain.com/api/cron/daily   -H "x-cron-secret: $CRON_SECRET"
GET https://your-domain.com/api/cron/monthly -H "x-cron-secret: $CRON_SECRET"
`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
