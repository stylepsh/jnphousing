import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ShieldCheck } from "lucide-react";
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

      {/* 엑셀 백업 — 최우선 노출 */}
      <Card className="mt-6 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            데이터 엑셀 백업 (수시 다운로드 권장)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground/80">
            모든 운영 데이터를 한 개의 엑셀 파일(시트 18개)로 다운로드합니다.
            <br />
            <span className="text-xs text-muted-foreground">건물·호실·임대인·임차인·계약·청구·입금·수수료·민원·문의·회원·매물·공지·서류·이벤트·알림·감사 로그</span>
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href="/api/admin/backup/excel" download>
              <Download className="h-4 w-4 mr-2" />
              지금 엑셀 백업 받기
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            팁: 매일/매주 다운로드 후 별도 저장소(개인 PC + 외장하드 + 클라우드 드라이브 등)에 분산 보관하세요.
            다운로드 시각은 감사 로그(/admin/audit)에 기록됩니다.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
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
