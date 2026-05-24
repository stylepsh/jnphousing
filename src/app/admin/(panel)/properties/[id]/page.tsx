import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWonMan } from "@/lib/money";
import { formatKoreanDate, isExpiringSoon } from "@/lib/dates";
import { UnitDialog } from "./unit-dialog";
import { BulkUnitDialog } from "./bulk-unit-dialog";
import type { Property } from "@/types/database";
import type { PropertyUnit, Lease, Tenant } from "@/types/lease";

const TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "상가",
};

async function fetchAll(id: string) {
  const supabase = await createClient();
  const [pRes, uRes, lRes] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("properties_units").select("*").eq("property_id", id).order("unit_no"),
    supabase.from("leases").select("*, tenant:tenants(name, phone)").in("status", ["active", "expiring", "draft"]),
  ]);
  return {
    property: pRes.data as Property | null,
    units: (uRes.data ?? []) as PropertyUnit[],
    leases: (lRes.data ?? []) as unknown as (Lease & { tenant: Pick<Tenant, "name" | "phone"> | null })[],
  };
}

const UNIT_STATUS_LABEL = (status: string | null, expiring: boolean): { l: string; c: string } => {
  if (status === "active" && expiring) return { l: "만료임박", c: "bg-amber-100 text-amber-800" };
  if (status === "active" || status === "expiring") return { l: "임차중", c: "bg-green-100 text-green-800" };
  if (status === "draft") return { l: "준비중", c: "bg-blue-100 text-blue-800" };
  return { l: "공실", c: "bg-slate-100 text-slate-700" };
};

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { property, units, leases } = await fetchAll(id);
  if (!property) notFound();

  const leaseByUnit = new Map<string, (Lease & { tenant: Pick<Tenant, "name" | "phone"> | null })>();
  for (const lease of leases) {
    leaseByUnit.set(lease.unit_id, lease);
  }

  const occupied = units.filter((u) => {
    const l = leaseByUnit.get(u.id);
    return l && (l.status === "active" || l.status === "expiring");
  }).length;
  const vacant = units.length - occupied;
  const expiringSoon = units.filter((u) => {
    const l = leaseByUnit.get(u.id);
    return l && l.status === "active" && isExpiringSoon(new Date(l.end_date), 60);
  }).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/properties"><ArrowLeft className="h-4 w-4 mr-1" /> 관리현장 목록</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{TYPE_LABEL[property.type] ?? property.type}</Badge>
            {property.is_published ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">공개</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">비공개</Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{property.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{property.address}</p>
        </div>
      </div>

      {/* 호실 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">총 호실</p><p className="text-2xl font-bold mt-1">{units.length}<span className="text-sm font-normal text-muted-foreground ml-1">/ {property.total_units} 세대</span></p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">임차중</p><p className="text-2xl font-bold mt-1 text-green-700">{occupied}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">공실</p><p className="text-2xl font-bold mt-1 text-slate-700">{vacant}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-5"><p className="text-xs text-muted-foreground">만료 임박 (60일)</p><p className="text-2xl font-bold mt-1 text-amber-700">{expiringSoon}</p></CardContent></Card>
      </div>

      {/* 건물 정보 + 설명 */}
      {property.description && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">건물 정보</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{property.description}</p>
          </CardContent>
        </Card>
      )}

      {/* 호실 목록 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">호실 목록 ({units.length})</CardTitle>
          <div className="flex gap-2">
            <BulkUnitDialog propertyId={property.id} />
            <UnitDialog mode="create" propertyId={property.id} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {units.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 호실이 없습니다.</p>
              <p className="text-xs mt-2">우상단 &quot;호실 추가&quot; 버튼으로 등록하세요.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">호실</TableHead>
                  <TableHead className="w-[80px]">평형/층</TableHead>
                  <TableHead>기본 임대 조건</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                  <TableHead>임차인 (계약)</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => {
                  const lease = leaseByUnit.get(u.id);
                  const expiring = lease ? isExpiringSoon(new Date(lease.end_date), 60) : false;
                  const cfg = UNIT_STATUS_LABEL(lease?.status ?? null, expiring);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.unit_no}</TableCell>
                      <TableCell className="text-xs">
                        {u.area_pyeong ? `${u.area_pyeong}평` : "-"}
                        {u.floor != null && <div className="text-muted-foreground">{u.floor}층</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        보 {formatWonMan(u.deposit_default)} / 월 {formatWonMan(u.rent_default)}
                        {u.management_fee_default > 0 && (
                          <div className="text-muted-foreground">관 {formatWonMan(u.management_fee_default)}</div>
                        )}
                      </TableCell>
                      <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {lease ? (
                          <Link href={`/admin/leases/${lease.id}`} className="hover:underline">
                            <div>{lease.tenant?.name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">~ {formatKoreanDate(lease.end_date)}</div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <UnitDialog mode="edit" propertyId={property.id} unit={u} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/admin/leases?unit=${property.id}`}>이 건물 계약 보기</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/admin/vacancies?property=${property.id}`}>공실 매물 노출 관리</Link>
        </Button>
      </div>
    </div>
  );
}
