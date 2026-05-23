import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { PropertyDialog } from "./property-dialog";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const [pRes, uRes, lRes] = await Promise.all([
    supabase.from("properties").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false }),
    supabase.from("properties_units").select("id, property_id"),
    supabase.from("leases").select("unit_id, status").in("status", ["active", "expiring"]),
  ]);
  const properties = (pRes.data ?? []) as Property[];
  const units = (uRes.data ?? []) as { id: string; property_id: string }[];
  const activeLeases = (lRes.data ?? []) as { unit_id: string; status: string }[];

  const unitsByProp = new Map<string, string[]>();
  for (const u of units) {
    if (!unitsByProp.has(u.property_id)) unitsByProp.set(u.property_id, []);
    unitsByProp.get(u.property_id)!.push(u.id);
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
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">관리현장</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {properties.length}개 등록됨 · 건물명 클릭으로 호실 관리</p>
        </div>
        <PropertyDialog mode="create" />
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
                        <Link href={`/admin/properties/${p.id}`} className="font-medium hover:underline">
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
                            <Link href={`/admin/properties/${p.id}`}>호실 <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
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
