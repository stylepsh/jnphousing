import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComplaintRow } from "./complaint-row";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Complaint } from "@/types/database";

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS",
  facility: "시설",
  noise: "소음",
  complaint: "민원",
  etc: "기타",
};

async function fetchComplaints(status?: string) {
  const supabase = await createClient();
  let q = supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Complaint[];
}

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const complaints = await fetchComplaints(status);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">민원/AS 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">접수된 민원을 확인하고 처리 상태를 관리하세요.</p>
        </div>
      </div>

      {/* 상태 필터 칩 */}
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {[
          { v: "all", l: "전체" },
          { v: "received", l: "접수" },
          { v: "in_progress", l: "처리중" },
          { v: "resolved", l: "완료" },
          { v: "closed", l: "종결" },
        ].map((f) => (
          <a
            key={f.v}
            href={`?status=${f.v}`}
            className={`px-3 py-1.5 rounded-full border transition ${
              (status ?? "all") === f.v
                ? "bg-primary text-white border-primary"
                : "bg-white text-foreground border-border hover:bg-muted"
            }`}
          >
            {f.l}
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">표시할 민원이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">접수일</TableHead>
                  <TableHead>건물·호수</TableHead>
                  <TableHead>입주자</TableHead>
                  <TableHead className="w-[70px]">분류</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[110px]">상태</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(c.created_at), "MM.dd HH:mm", { locale: ko })}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="font-medium">{c.building_name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{c.unit_number ?? "-"}호</div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div>{c.tenant_name}</div>
                      <div className="text-xs text-muted-foreground">{c.tenant_phone}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{CATEGORY_LABEL[c.category]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate">{c.title}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right">
                      <ComplaintRow complaint={c} />
                    </TableCell>
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

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { l: string; c: string }> = {
    received: { l: "접수", c: "bg-blue-100 text-blue-800" },
    in_progress: { l: "처리중", c: "bg-amber-100 text-amber-800" },
    resolved: { l: "완료", c: "bg-green-100 text-green-800" },
    closed: { l: "종결", c: "bg-slate-100 text-slate-700" },
  };
  const s = cfg[status] ?? cfg.received;
  return <Badge className={`${s.c} hover:${s.c}`}>{s.l}</Badge>;
}
