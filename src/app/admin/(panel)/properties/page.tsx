import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { PropertyDialog } from "./property-dialog";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Property } from "@/types/database";

const TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "상가",
};

interface UnitStat {
  property_id: string;
  total: number;
  occupied: number;
}

async function fetchData() {
  if (!isSupabaseConfigured()) {
    return { properties: [] as Property[], stats: new Map<string, UnitStat>() };
  }
  const supabase = await createClient();
  // 신 통합 모델: properties 가 건물·호실을 함께 보관 → 건물만(또는 레거시 null) 표시.
  const [pRes, uRes, lRes] = await Promise.all([
    supabase.from("properties").select("*").or("unit_type.eq.building,unit_type.is.null").order("display_order", { ascending: true }).order("created_at", { ascending: false }),
    supabase.from("properties").select("id, parent_building_id").eq("unit_type", "unit"),
    supabase.from("leases").select("unit_id, status").in("status", ["active", "expiring"]),
  ]);
  const properties = (pRes.data ?? []) as Property[];
  const units = (uRes.data ?? []) as { id: string; parent_building_id: string | null }[];
  const activeLeases = (lRes.data ?? []) as { unit_id: string; status: string }[];

  const unitsByProp = new Map<string, string[]>();
  for (const u of units) {
    if (!u.parent_building_id) continue;
    if (!unitsByProp.has(u.parent_building_id)) unitsByProp.set(u.parent_building_id, []);
    unitsByProp.get(u.parent_building_id)!.push(u.id);
  }
  const occupiedUnitIds = new Set(activeLeases.map((l) => l.unit_id));

  const stats: Map<string, UnitStat> = new Map();
  for (const p of properties) {
    const ids = unitsByProp.get(p.id) ?? [];
    const occupied = ids.filter((id) => occupiedUnitIds.has(id)).length;
    stats.set(p.id, { property_id: p.id, total: ids.length, occupied });
  }
  return { properties, stats };
}

export default async function PropertiesAdminPage() {
  const { properties, stats } = await fetchData();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">관리현장</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {properties.length}개 건물 · 건물명 클릭으로 호실 현황</p>
        </div>
        <PropertyDialog mode="create" />
      </div>

      {/* 등록은 소유주(임대인) 중심 흐름으로 안내 */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex items-center justify-between gap-3 flex-wrap">
        <span>
          💡 신규 등록은 <strong>소유주(임대인)</strong> 화면에서 <strong>임대인 → 건물 → 호실 일괄 → 계약</strong>을 한 번에 진행하는 것을 권장합니다.
        </span>
        <Button asChild size="sm" variant="outline" className="border-blue-300 bg-white">
          <Link href="/admin/owners">소유주 화면으로 →</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">등록된 관리현장이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">순서</TableHead>
                  <TableHead>건물명</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead className="w-[80px]">유형</TableHead>
                  <TableHead className="w-[120px]">호실 (임차/공실)</TableHead>
                  <TableHead className="w-[80px]">공개</TableHead>
                  <TableHead className="text-right w-[160px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((p) => {
                  const s = stats.get(p.id);
                  const total = s?.total ?? 0;
                  const occupied = s?.occupied ?? 0;
                  const vacant = total - occupied;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm tabular-nums">{p.display_order}</TableCell>
                      <TableCell>
                        <Link href={`/admin/buildings/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{p.address}</TableCell>
                      <TableCell><Badge variant="outline">{TYPE_LABEL[p.type] ?? p.type}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {total === 0 ? (
                          <span className="text-muted-foreground">호실 미등록</span>
                        ) : (
                          <span>
                            <span className="text-green-700 font-semibold">{occupied}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-slate-700">{vacant}</span>
                            <span className="text-muted-foreground"> / 총 {total}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{p.is_published ? "공개" : "비공개"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/admin/buildings/${p.id}`}>호실 <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
                          </Button>
                          <PropertyDialog mode="edit" property={p} />
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
    </div>
  );
}
