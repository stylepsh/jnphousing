import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatKoreanDate } from "@/lib/dates";

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

async function fetchLogs(): Promise<AuditRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as AuditRow[];
}

export const metadata = { title: "감사 로그" };

export default async function AuditPage() {
  const logs = await fetchLogs();
  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">감사 로그</h1>
        <p className="mt-1 text-sm text-muted-foreground">민감 작업 이력 · 최근 {logs.length}건 (불변 로그)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">기록된 감사 로그가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">시각</TableHead>
                  <TableHead className="w-[80px]">주체</TableHead>
                  <TableHead>액션</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>변경</TableHead>
                  <TableHead className="w-[110px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{formatKoreanDate(l.created_at.slice(0, 10))} {l.created_at.slice(11, 16)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{l.actor_role ?? "-"}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{l.action}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-xs mr-1">{l.resource_type}</Badge>
                      <span className="text-muted-foreground font-mono">{l.resource_id?.slice(0, 8) ?? "-"}</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[320px]">
                      {l.before || l.after ? (
                        <pre className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1 overflow-x-auto">
                          {JSON.stringify({ before: l.before, after: l.after }, null, 0).slice(0, 200)}
                        </pre>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.ip ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
