import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InquiryRow } from "./inquiry-row";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Inquiry } from "@/types/database";

async function fetchInquiries(status?: string) {
  const supabase = await createClient();
  let q = supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Inquiry[];
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const inquiries = await fetchInquiries(status);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">신규 건물 관리문의</h1>
        <p className="mt-1 text-sm text-muted-foreground">잠재 고객의 관리 문의를 응대하세요.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {[
          { v: "all", l: "전체" },
          { v: "new", l: "신규" },
          { v: "contacted", l: "응대중" },
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
          {inquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">표시할 문의가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">접수일</TableHead>
                  <TableHead>담당자/회사</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>건물 주소</TableHead>
                  <TableHead className="w-[80px]">세대수</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(q.created_at), "MM.dd HH:mm", { locale: ko })}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{q.contact_name}</div>
                      <div className="text-xs text-muted-foreground">{q.company_name ?? "-"}</div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{q.phone}</TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate">{q.building_address}</TableCell>
                    <TableCell className="text-sm text-center">{q.total_units ?? "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <InquiryRow inquiry={q} />
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
    new: { l: "신규", c: "bg-blue-100 text-blue-800" },
    contacted: { l: "응대중", c: "bg-amber-100 text-amber-800" },
    closed: { l: "종결", c: "bg-slate-100 text-slate-700" },
  };
  const s = cfg[status] ?? cfg.new;
  return <Badge className={`${s.c} hover:${s.c}`}>{s.l}</Badge>;
}
