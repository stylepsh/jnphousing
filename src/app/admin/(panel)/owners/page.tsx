import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, Building2, DoorOpen, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { maskPhone } from "@/lib/pii";
import { OwnerDialog } from "./owner-dialog";
import { modeLabel, type OwnerPipeline } from "./constants";

export const metadata: Metadata = { title: "소유주(임대인)" };
export const dynamic = "force-dynamic";

interface OwnerRow {
  id: string;
  name: string;
  phone: string | null;
  modes: string[];
  pipe: OwnerPipeline | null;
}

async function fetchOwners(): Promise<OwnerRow[]> {
  try {
    const supabase = await createClient();
    const [ownersRes, pipeRes, propsRes] = await Promise.all([
      supabase.from("owners").select("id, name, phone").order("name"),
      supabase.from("v_owner_pipeline").select("*"),
      supabase.from("properties").select("owner_id, service_modes").not("owner_id", "is", null),
    ]);

    const owners = (ownersRes.data ?? []) as { id: string; name: string; phone: string | null }[];
    const pipeMap = new Map<string, OwnerPipeline>();
    for (const p of (pipeRes.data ?? []) as OwnerPipeline[]) pipeMap.set(p.owner_id, p);

    // 임대인별 관리유형 롤업
    const modeMap = new Map<string, Set<string>>();
    for (const r of (propsRes.data ?? []) as { owner_id: string; service_modes: string[] | null }[]) {
      if (!r.owner_id) continue;
      const set = modeMap.get(r.owner_id) ?? new Set<string>();
      for (const m of r.service_modes ?? []) set.add(m);
      modeMap.set(r.owner_id, set);
    }

    return owners.map((o) => ({
      id: o.id,
      name: o.name,
      phone: o.phone,
      modes: Array.from(modeMap.get(o.id) ?? []),
      pipe: pipeMap.get(o.id) ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function OwnersPage() {
  const owners = await fetchOwners();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">소유주(임대인)</h1>
          <p className="mt-1 text-sm text-muted-foreground">우리 회사에 운영을 맡긴 소유주 {owners.length}명 · 임대인별 물건·공실·임차·월세 파이프라인</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export/overview"
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition"
          >
            <Download className="h-4 w-4" /> 현황 엑셀
          </a>
          <OwnerDialog mode="create" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {owners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              등록된 소유주(임대인)가 없습니다. 우측 상단 &quot;소유주 등록&quot;으로 시작하세요.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>소유주(임대인)</TableHead>
                  <TableHead>관리유형</TableHead>
                  <TableHead className="text-center">물건</TableHead>
                  <TableHead className="text-center">공실</TableHead>
                  <TableHead className="text-center">임차중</TableHead>
                  <TableHead className="text-center">이번달 월세</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((o) => {
                  const p = o.pipe;
                  const overdue = p?.month_overdue_count ?? 0;
                  const paid = p?.month_paid_count ?? 0;
                  const inv = p?.month_invoice_count ?? 0;
                  return (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell>
                        <Link href={`/admin/owners/${o.id}`} className="block">
                          <span className="font-medium">{o.name}</span>
                          <span className="block text-xs text-muted-foreground">{o.phone ? maskPhone(o.phone) : "-"}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {o.modes.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : o.modes.map((m) => {
                            const ml = modeLabel(m);
                            return <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ml.color}`}>{ml.label}</span>;
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3 text-muted-foreground" />{p?.building_count ?? 0}</span>
                        <span className="mx-1 text-muted-foreground">·</span>
                        <span className="inline-flex items-center gap-1"><DoorOpen className="h-3 w-3 text-muted-foreground" />{p?.unit_count ?? 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {(p?.vacant_count ?? 0) > 0
                          ? <span className="font-semibold text-amber-600">{p?.vacant_count}</span>
                          : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm">{p?.occupied_count ?? 0}</TableCell>
                      <TableCell className="text-center text-xs">
                        {inv === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span>
                            <span className="text-emerald-600 font-medium">{paid}완납</span>
                            {overdue > 0 && <span className="text-red-600 font-medium"> · {overdue}연체</span>}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/owners/${o.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
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
