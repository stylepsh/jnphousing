import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileSignature, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWonMan } from "@/lib/money";
import { formatKoreanDate, isExpiringSoon } from "@/lib/dates";
import type { Lease, Landlord, Tenant, PropertyUnit } from "@/types/lease";

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  draft:      { l: "초안", c: "bg-slate-100 text-slate-700" },
  active:     { l: "진행중", c: "bg-green-100 text-green-800" },
  expiring:   { l: "만료임박", c: "bg-amber-100 text-amber-800" },
  renewed:    { l: "갱신", c: "bg-blue-100 text-blue-800" },
  terminated: { l: "해지", c: "bg-red-100 text-red-700" },
  expired:    { l: "만료", c: "bg-slate-100 text-slate-500" },
};

async function fetchData(status: string | undefined) {
  const supabase = await createClient();
  let q = supabase.from("leases").select("*").order("end_date", { ascending: true }).limit(500);
  if (status && status !== "all") q = q.eq("status", status);
  const [lRes, llRes, tRes, uRes] = await Promise.all([
    q,
    supabase.from("landlords").select("id, name"),
    supabase.from("tenants").select("id, name"),
    supabase.from("properties_units").select("id, unit_no, property_id, properties:property_id(name)"),
  ]);
  const leases = (lRes.data ?? []) as Lease[];
  const landlords = (llRes.data ?? []) as Pick<Landlord, "id" | "name">[];
  const tenants = (tRes.data ?? []) as Pick<Tenant, "id" | "name">[];
  const units = (uRes.data ?? []) as unknown as (Pick<PropertyUnit, "id" | "unit_no" | "property_id"> & { properties: { name: string } | null })[];
  return { leases, landlords, tenants, units };
}

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { leases, landlords, tenants, units } = await fetchData(status);

  const lmap = new Map(landlords.map((l) => [l.id, l.name]));
  const tmap = new Map(tenants.map((t) => [t.id, t.name]));
  const umap = new Map(units.map((u) => [u.id, { unit_no: u.unit_no, property: u.properties?.name ?? "—" }]));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">계약</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {leases.length}건 · 만료 60일 이내 표시</p>
        </div>
        <Button asChild>
          <Link href="/admin/leases/new"><Plus className="h-4 w-4 mr-1.5" /> 신규 계약</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {[
          { v: "all", l: "전체" },
          { v: "draft", l: "초안" },
          { v: "active", l: "진행중" },
          { v: "expiring", l: "만료임박" },
          { v: "terminated", l: "해지" },
          { v: "expired", l: "만료" },
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
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
              해당 상태의 계약이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">유형</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>임대인 / 임차인</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="w-[100px]">보증금/월세</TableHead>
                  <TableHead className="w-[80px]">수수료</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((l) => {
                  const u = umap.get(l.unit_id);
                  const cfg = STATUS_LABEL[l.status] ?? STATUS_LABEL.draft;
                  const expiring = isExpiringSoon(new Date(l.end_date), 60);
                  return (
                    <TableRow key={l.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {l.lease_type === "long_term" ? "장기" : "단기"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Link href={`/admin/leases/${l.id}`} className="hover:underline">
                          <div className="font-medium">{u?.property ?? "—"} · {u?.unit_no}</div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{lmap.get(l.landlord_id) ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">↓ {tmap.get(l.tenant_id) ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatKoreanDate(l.start_date)}
                        <br />
                        ~ {formatKoreanDate(l.end_date)}
                        {expiring && l.status === "active" && (
                          <Badge variant="outline" className="ml-1 text-xs text-amber-700 border-amber-300">
                            <AlertCircle className="h-3 w-3 mr-0.5" /> 60일
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        보 {formatWonMan(l.deposit)}<br />월 {formatWonMan(l.rent_amount)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {l.fee_type === "percent"
                          ? `${l.fee_percent}%`
                          : `${formatWonMan(l.fee_fixed ?? 0)}원`}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${cfg.c} hover:${cfg.c}`}>{cfg.l}</Badge>
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
