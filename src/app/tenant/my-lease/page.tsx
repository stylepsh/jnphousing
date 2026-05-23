import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, LogOut } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant-session";
import { LogoutButton } from "./logout-button";
import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import type { Lease, Tenant, PropertyUnit } from "@/types/lease";

export const metadata = { title: "내 계약 정보" };

async function fetchLease(leaseId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("leases")
    .select("*, tenant:tenants(name, phone), unit:properties_units(unit_no, properties(name, address))")
    .eq("id", leaseId)
    .maybeSingle();
  return data as unknown as (Lease & {
    tenant: Pick<Tenant, "name" | "phone"> | null;
    unit: (Pick<PropertyUnit, "unit_no"> & { properties: { name: string; address: string } | null }) | null;
  }) | null;
}

export default async function MyLeasePage() {
  const session = await getTenantSession();
  if (!session) redirect("/tenant/login");

  const lease = await fetchLease(session.lease_id);
  if (!lease) redirect("/tenant/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/tenant" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> 입주민 메인
        </Link>
        <LogoutButton />
      </div>

      <h1 className="text-3xl font-bold tracking-tight">내 계약 정보</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {lease.tenant?.name} 님 · {lease.unit?.properties?.name} · {lease.unit?.unit_no}호
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            계약 요약
            <Badge variant="outline" className="text-xs">{lease.lease_type === "long_term" ? "장기" : "단기"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm">
          <Row label="주소" value={lease.unit?.properties?.address ?? "—"} />
          <Row label="계약 기간" value={`${formatKoreanDate(lease.start_date)} ~ ${formatKoreanDate(lease.end_date)}`} />
          <Row label="보증금" value={formatWonSuffix(lease.deposit)} />
          <Row label="월세" value={formatWonSuffix(lease.rent_amount)} />
          <Row label="관리비" value={formatWonSuffix(lease.management_fee)} />
          <Row label="청구일" value={lease.rent_day ? `매월 ${lease.rent_day}일` : `${lease.rent_cycle} 주기`} />
        </CardContent>
      </Card>

      {lease.special_terms && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">특약사항</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{lease.special_terms}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        <Button asChild className="h-auto py-4">
          <Link href="/tenant/my-rent">
            <span className="text-left">
              <div className="font-semibold">청구·납부 내역</div>
              <div className="text-xs opacity-80 mt-0.5">월별 청구, 입금 상태</div>
            </span>
          </Link>
        </Button>
        {lease.contract_file_path ? (
          <Button asChild variant="outline" className="h-auto py-4">
            <Link href={`/tenant/my-lease/contract`}>
              <FileText className="h-4 w-4 mr-2" />
              <span className="text-left">
                <div className="font-semibold">계약서 다운로드</div>
                <div className="text-xs opacity-80 mt-0.5">5분 유효한 링크</div>
              </span>
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled className="h-auto py-4">
            <FileText className="h-4 w-4 mr-2" />
            <span>계약서 미등록</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
