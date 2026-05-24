import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2 } from "lucide-react";
import { requireLandlord } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { formatWonMan } from "@/lib/money";
import { formatKoreanDate, isExpiringSoon } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { Lease, PropertyUnit, Tenant } from "@/types/lease";
import type { Property } from "@/types/database";

export const metadata = { title: "내 건물·호실" };

async function fetchLeases(landlordId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("leases")
    .select("*, tenant:tenants(name), unit:properties_units(id, unit_no, floor, area_pyeong, property:property_id(id, name, address))")
    .eq("landlord_id", landlordId)
    .order("end_date", { ascending: true });
  return (data ?? []) as unknown as (Lease & {
    tenant: Pick<Tenant, "name"> | null;
    unit: (Pick<PropertyUnit, "id" | "unit_no" | "floor" | "area_pyeong"> & {
      property: Pick<Property, "id" | "name" | "address"> | null;
    }) | null;
  })[];
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  active: { l: "임차중", c: "bg-green-100 text-green-800" },
  expiring: { l: "만료임박", c: "bg-amber-100 text-amber-800" },
  draft: { l: "준비중", c: "bg-blue-100 text-blue-800" },
  terminated: { l: "해지", c: "bg-red-100 text-red-700" },
  expired: { l: "만료", c: "bg-slate-100 text-slate-500" },
  renewed: { l: "갱신", c: "bg-blue-100 text-blue-800" },
};

export default async function LandlordPropertiesPage() {
  let landlordId: string;
  try {
    const ctx = await requireLandlord();
    landlordId = ctx.landlord.id;
  } catch (e) {
    if (e instanceof AppError) redirect("/landlord/login?error=not_landlord");
    redirect("/landlord/login");
  }

  const leases = await fetchLeases(landlordId);

  // 건물별 그룹화
  const byProperty = new Map<string, { name: string; address: string; leases: typeof leases }>();
  for (const l of leases) {
    const propId = l.unit?.property?.id;
    if (!propId) continue;
    if (!byProperty.has(propId)) {
      byProperty.set(propId, {
        name: l.unit?.property?.name ?? "—",
        address: l.unit?.property?.address ?? "—",
        leases: [],
      });
    }
    byProperty.get(propId)!.leases.push(l);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/landlord/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> 대시보드</Link>
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">내 건물 · 호실 현황</h1>
      <p className="mt-1 text-sm text-muted-foreground">소유 건물별로 호실 임차 상태를 한눈에 확인</p>

      {byProperty.size === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>아직 등록된 계약이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-5">
          {Array.from(byProperty.entries()).map(([pid, p]) => {
            const occupied = p.leases.filter((l) => l.status === "active" || l.status === "expiring").length;
            return (
              <Card key={pid}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{p.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{p.address}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-xs text-muted-foreground">임차/총</p>
                      <p className="font-bold"><span className="text-green-700">{occupied}</span> / {p.leases.length}</p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">호실</TableHead>
                        <TableHead>임차인</TableHead>
                        <TableHead>기간</TableHead>
                        <TableHead className="w-[110px]">보증금/월세</TableHead>
                        <TableHead className="w-[100px]">상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.leases.map((l) => {
                        const cfg = STATUS_LABEL[l.status] ?? STATUS_LABEL.draft;
                        const expiring = l.status === "active" && isExpiringSoon(new Date(l.end_date), 60);
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.unit?.unit_no}</TableCell>
                            <TableCell className="text-sm">{l.tenant?.name ?? "—"}</TableCell>
                            <TableCell className="text-xs">
                              {formatKoreanDate(l.start_date)}<br />
                              ~ {formatKoreanDate(l.end_date)}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              보 {formatWonMan(l.deposit)}<br />
                              월 {formatWonMan(l.rent_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge>
                              {expiring && <p className="text-[10px] text-amber-700 mt-0.5">60일 이내</p>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
