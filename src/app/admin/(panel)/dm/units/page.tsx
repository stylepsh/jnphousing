import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "JNP 호실 목록" };
export const dynamic = "force-dynamic";

interface UnitRow {
  id: string;
  property_id: string | null;
  alias: string | null;
  profit_share_ratio: string | null;
  monthly_target_revenue: number | null;
  status: string;
  landlord_business_id: string | null;
  started_at: string | null;
}

interface PropertyRow { id: string; name: string; short_alias: string | null }
interface LandlordRow { id: string; name: string }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active:      { label: "운영중", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vacant:      { label: "공실",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  maintenance: { label: "정비중", color: "bg-blue-50 text-blue-700 border-blue-200" },
  terminated:  { label: "종료",   color: "bg-slate-50 text-slate-700 border-slate-200" },
};

async function fetchData() {
  try {
    const supabase = await createClient();
    const [u, p, l] = await Promise.all([
      supabase.from("dm_units").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("id, name, short_alias"),
      supabase.from("landlord_business").select("id, name"),
    ]);
    return {
      units: (u.data ?? []) as UnitRow[],
      properties: (p.data ?? []) as PropertyRow[],
      landlords: (l.data ?? []) as LandlordRow[],
    };
  } catch {
    return { units: [], properties: [], landlords: [] };
  }
}

export default async function DmUnitsPage() {
  const { units, properties, landlords } = await fetchData();
  const propMap = new Map(properties.map(p => [p.id, p]));
  const lbMap = new Map(landlords.map(l => [l.id, l]));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Link href="/admin/dm" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> JNP 대시보드
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Home className="h-6 w-6 text-purple-600" />
            JNP 호실 목록
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">단기임대 운영 호실 · 등록 {units.length}호</p>
        </div>
        <Button asChild>
          <Link href="/admin/dm/units/new"><Plus className="h-4 w-4 mr-1.5" /> 호실 추가</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {units.length === 0 ? (
            <div className="text-center py-16">
              <Home className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">등록된 JNP 호실 없음</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/admin/dm/units/new"><Plus className="h-3.5 w-3.5 mr-1" /> 첫 호실 추가</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>호실</TableHead>
                  <TableHead>건물</TableHead>
                  <TableHead>임사자</TableHead>
                  <TableHead>분배</TableHead>
                  <TableHead className="text-right">목표 월수익</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>시작일</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map(u => {
                  const prop = u.property_id ? propMap.get(u.property_id) : null;
                  const lb = u.landlord_business_id ? lbMap.get(u.landlord_business_id) : null;
                  const st = STATUS_LABEL[u.status] ?? STATUS_LABEL.active;
                  return (
                    <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <Link href={`/admin/dm/units/${u.id}/edit`} className="block">
                          {u.alias ?? "(별칭 없음)"}
                        </Link>
                      </TableCell>
                      <TableCell><Link href={`/admin/dm/units/${u.id}/edit`} className="block">{prop?.short_alias ?? prop?.name ?? "-"}</Link></TableCell>
                      <TableCell><Link href={`/admin/dm/units/${u.id}/edit`} className="block">{lb?.name ?? "-"}</Link></TableCell>
                      <TableCell><Link href={`/admin/dm/units/${u.id}/edit`} className="block"><Badge variant="outline" className="font-mono text-[10px]">{u.profit_share_ratio ?? "-"}</Badge></Link></TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Link href={`/admin/dm/units/${u.id}/edit`} className="block">
                          {u.monthly_target_revenue ? `${Math.floor(u.monthly_target_revenue / 10000).toLocaleString()}만` : "-"}
                        </Link>
                      </TableCell>
                      <TableCell><Link href={`/admin/dm/units/${u.id}/edit`} className="block"><Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge></Link></TableCell>
                      <TableCell className="text-xs"><Link href={`/admin/dm/units/${u.id}/edit`} className="block">{u.started_at?.slice(0, 10) ?? "-"}</Link></TableCell>
                      <TableCell><Link href={`/admin/dm/units/${u.id}/edit`} className="block text-muted-foreground"><ArrowRight className="h-4 w-4" /></Link></TableCell>
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
