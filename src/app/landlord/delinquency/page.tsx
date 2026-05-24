import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, Phone, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "임차인 연체 관리" };
export const dynamic = "force-dynamic";

interface OverdueInvoice {
  id: string;
  unit_id: string;
  due_date: string;
  amount_total: number;
  paid_total: number;
  overdue_days: number;
  overdue_interest: number;
  tenants: { name: string; phone: string } | null;
  properties_units: { unit_no: string; properties: { name: string } | null } | null;
}

async function fetchOverdue(): Promise<OverdueInvoice[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rent_invoices")
      .select(`
        id, unit_id, due_date, amount_total, paid_total, overdue_days, overdue_interest,
        tenants(name, phone),
        properties_units(unit_no, properties(name))
      `)
      .in("status", ["unpaid", "overdue", "partial"])
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .order("overdue_days", { ascending: false })
      .limit(50);
    return (data ?? []) as unknown as OverdueInvoice[];
  } catch {
    return [];
  }
}

export default async function LandlordDelinquencyPage() {
  const overdueList = await fetchOverdue();
  if (overdueList.length === 0 && false) redirect("/landlord/dashboard");

  const totalOverdueAmount = overdueList.reduce((sum, i) => sum + (i.amount_total - i.paid_total), 0);
  const totalInterest = overdueList.reduce((sum, i) => sum + i.overdue_interest, 0);
  const tenantsCount = new Set(overdueList.map(i => i.tenants?.name ?? "")).size;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임차인 연체 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">총 {overdueList.length}건 연체 · {tenantsCount}명 임차인</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-muted-foreground">총 연체액</p>
            <p className="text-2xl font-bold mt-1 text-red-700 tabular-nums">{totalOverdueAmount.toLocaleString()}원</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-muted-foreground">누적 연체이자</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{totalInterest.toLocaleString()}원</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-muted-foreground">평균 연체일</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {overdueList.length > 0 ? Math.round(overdueList.reduce((s, i) => s + i.overdue_days, 0) / overdueList.length) : 0}일
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {overdueList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">현재 연체 중인 임차인이 없습니다. 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>임차인</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>마감일</TableHead>
                  <TableHead className="text-right">연체액</TableHead>
                  <TableHead>연체일</TableHead>
                  <TableHead>회수 시도</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueList.map(i => {
                  const remaining = i.amount_total - i.paid_total;
                  const severity = i.overdue_days > 60 ? "critical" : i.overdue_days > 30 ? "high" : i.overdue_days > 7 ? "medium" : "low";
                  const color = severity === "critical" ? "bg-red-100 text-red-800 border-red-200"
                              : severity === "high" ? "bg-orange-100 text-orange-800 border-orange-200"
                              : severity === "medium" ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200";
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="font-medium">{i.tenants?.name ?? "-"}</div>
                        <div className="text-[11px] text-muted-foreground">{i.tenants?.phone ?? "-"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {i.properties_units?.properties?.name ?? "-"}
                        <div className="text-[10px] text-muted-foreground">{i.properties_units?.unit_no ?? "-"}호</div>
                      </TableCell>
                      <TableCell className="text-xs">{i.due_date}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold tabular-nums">{remaining.toLocaleString()}원</div>
                        {i.overdue_interest > 0 && (
                          <div className="text-[10px] text-muted-foreground">+ 이자 {i.overdue_interest.toLocaleString()}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${color}`}>{i.overdue_days}일</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {i.tenants?.phone && (
                            <Button asChild size="icon-xs" variant="ghost" title="전화">
                              <a href={`tel:${i.tenants.phone}`}><Phone className="h-3 w-3" /></a>
                            </Button>
                          )}
                          <Button size="icon-xs" variant="ghost" title="카톡 안내 (mock)">
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
        <p className="font-bold mb-1 flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" /> 회수 전략 안내
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li><b>7일 이내:</b> 카톡·문자 자동 안내 + 임차인 자율 납부 유도</li>
          <li><b>8~30일:</b> 관리실 직접 전화 + 분할 납부 협의</li>
          <li><b>31~60일:</b> 내용증명 발송 + 명도 사전 협의</li>
          <li><b>60일+:</b> JNP 법무팀 연결 + 명도소송 / HUG 보증 청구 검토</li>
        </ul>
      </div>
    </div>
  );
}
