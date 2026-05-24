import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { requireLandlord } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { formatKoreanDate } from "@/lib/dates";
import { formatWonSuffix } from "@/lib/money";
import { AppError } from "@/lib/errors";

export const metadata = { title: "월간 보고서" };

interface ReportRow {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  pdf_path: string | null;
  total_billing: number;
  total_paid: number;
  total_outstanding: number;
  total_commission: number;
  net_payout: number;
  generated_at: string;
  sent_at: string | null;
}

async function fetchReports(landlordId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("landlord_reports")
    .select("*")
    .eq("landlord_id", landlordId)
    .order("period_end", { ascending: false })
    .limit(50);
  return (data ?? []) as ReportRow[];
}

export default async function LandlordReportsPage() {
  let landlordId: string;
  try {
    const ctx = await requireLandlord();
    landlordId = ctx.landlord.id;
  } catch (e) {
    if (e instanceof AppError) redirect("/landlord/login?error=not_landlord");
    redirect("/landlord/login");
  }

  const reports = await fetchReports(landlordId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/landlord/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> 대시보드</Link>
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">월간 보고서</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        매월 1일 자동 생성 · 청구·수금·연체·수수료·실수령액 상세
      </p>

      <Card className="mt-6 mb-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">이번달 즉시 보고서 발급</p>
              <p className="text-xs text-muted-foreground mt-0.5">최신 데이터 기준 PDF 즉시 다운로드</p>
            </div>
            <Button asChild>
              <a href="/landlord/reports/current.pdf" target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1.5" /> 즉시 다운로드
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              아직 생성된 보고서가 없습니다.<br />
              <span className="text-xs">매월 1일 자동 생성됩니다. 위 버튼으로 즉시 발급 가능.</span>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기간</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>청구</TableHead>
                  <TableHead>수금</TableHead>
                  <TableHead>수수료</TableHead>
                  <TableHead>실수령</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{formatKoreanDate(r.period_start)}<br />~ {formatKoreanDate(r.period_end)}</TableCell>
                    <TableCell className="text-xs">{r.period_type === "monthly" ? "월간" : r.period_type === "weekly" ? "주간" : "맞춤"}</TableCell>
                    <TableCell className="text-sm">{formatWonSuffix(r.total_billing)}</TableCell>
                    <TableCell className="text-sm text-green-700">{formatWonSuffix(r.total_paid)}</TableCell>
                    <TableCell className="text-sm">{formatWonSuffix(r.total_commission)}</TableCell>
                    <TableCell className="text-sm font-bold text-primary">{formatWonSuffix(r.net_payout)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/landlord/reports/${r.id}.pdf`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
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
