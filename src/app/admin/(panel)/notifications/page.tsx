import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/notify/templates";
import { formatKoreanDate } from "@/lib/dates";
import type { NotificationLog } from "@/types/lease";

export const metadata = { title: "알림 발송 이력" };

async function fetchLogs(): Promise<NotificationLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as NotificationLog[];
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  queued: { l: "대기", c: "bg-slate-100 text-slate-700" },
  sent: { l: "발송", c: "bg-green-100 text-green-800" },
  failed: { l: "실패", c: "bg-red-100 text-red-700" },
  skipped: { l: "스킵(콘솔)", c: "bg-amber-100 text-amber-800" },
};

export default async function NotificationsPage() {
  const logs = await fetchLogs();
  const templates = listTemplates();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">알림 시스템</h1>
        <p className="mt-1 text-sm text-muted-foreground">발송 이력 {logs.length}건 · 템플릿 {templates.length}종</p>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">발송 이력</TabsTrigger>
          <TabsTrigger value="templates">템플릿</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">발송된 알림이 없습니다.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">시각</TableHead>
                      <TableHead className="w-[70px]">채널</TableHead>
                      <TableHead>받는이</TableHead>
                      <TableHead>템플릿</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>오류</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((n) => {
                      const cfg = STATUS_LABEL[n.status] ?? STATUS_LABEL.queued;
                      return (
                        <TableRow key={n.id}>
                          <TableCell className="text-xs">{formatKoreanDate(n.created_at.slice(0, 10))} {n.created_at.slice(11, 16)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{n.channel}</Badge></TableCell>
                          <TableCell className="text-sm">{n.recipient}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{n.template_key}</TableCell>
                          <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
                          <TableCell className="text-xs text-red-700 max-w-[200px] truncate">{n.error_message ?? "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-3">
          {templates.map((t) => (
            <Card key={t.key}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs font-mono">{t.key}</Badge>
                  <span className="font-semibold text-sm">{t.subject}</span>
                </div>
                <pre className="text-xs whitespace-pre-wrap text-foreground/80 bg-muted/40 rounded p-3 font-sans">
                  {t.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
