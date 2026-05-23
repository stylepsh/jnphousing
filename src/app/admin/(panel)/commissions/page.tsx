import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import { CommissionTrigger } from "./trigger";
import { CommissionPayButton } from "./pay-button";
import type { AgencyCommission, Lease, PropertyUnit, Landlord } from "@/types/lease";

async function fetchAll() {
  const supabase = await createClient();
  const [cRes, lRes, uRes, llRes] = await Promise.all([
    supabase.from("agency_commissions").select("*").order("period_end", { ascending: false }).limit(500),
    supabase.from("leases").select("id, unit_id, landlord_id"),
    supabase.from("properties_units").select("id, unit_no, property_id, properties:property_id(name)"),
    supabase.from("landlords").select("id, name"),
  ]);
  return {
    commissions: (cRes.data ?? []) as AgencyCommission[],
    leases: (lRes.data ?? []) as Pick<Lease, "id" | "unit_id" | "landlord_id">[],
    units: (uRes.data ?? []) as unknown as (Pick<PropertyUnit, "id" | "unit_no"> & { properties: { name: string } | null })[],
    landlords: (llRes.data ?? []) as Pick<Landlord, "id" | "name">[],
  };
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  pending: { l: "정산 대기", c: "bg-amber-100 text-amber-800" },
  paid: { l: "정산 완료", c: "bg-green-100 text-green-800" },
  waived: { l: "면제", c: "bg-slate-100 text-slate-700" },
};

export default async function CommissionsPage() {
  const { commissions, leases, units, landlords } = await fetchAll();
  const leaseMap = new Map(leases.map((l) => [l.id, l]));
  const unitMap = new Map(units.map((u) => [u.id, u]));
  const llMap = new Map(landlords.map((l) => [l.id, l.name]));

  const pending = commissions.filter((c) => c.status === "pending");
  const pendingTotal = pending.reduce((s, c) => s + c.commission_amount, 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">위탁수수료</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            대기 {pending.length}건 / {formatWonSuffix(pendingTotal)} · 전체 {commissions.length}건
          </p>
        </div>
        <CommissionTrigger />
      </div>

      <Card>
        <CardContent className="p-0">
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">아직 정산된 수수료가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기간</TableHead>
                  <TableHead>호실</TableHead>
                  <TableHead>임대인</TableHead>
                  <TableHead>기준액</TableHead>
                  <TableHead>수수료</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => {
                  const lease = leaseMap.get(c.lease_id);
                  const unit = lease ? unitMap.get(lease.unit_id) : null;
                  const llName = lease ? llMap.get(lease.landlord_id) : null;
                  const cfg = STATUS_LABEL[c.status] ?? STATUS_LABEL.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{formatKoreanDate(c.period_start)} ~ {formatKoreanDate(c.period_end)}</TableCell>
                      <TableCell className="text-sm">{unit?.properties?.name ?? "—"} · {unit?.unit_no}</TableCell>
                      <TableCell className="text-sm">{llName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatWonSuffix(c.base_amount)}</TableCell>
                      <TableCell className="text-sm font-bold">{formatWonSuffix(c.commission_amount)}</TableCell>
                      <TableCell><Badge className={`${cfg.c} hover:${cfg.c} text-xs`}>{cfg.l}</Badge></TableCell>
                      <TableCell className="text-right">
                        {c.status === "pending" && <CommissionPayButton id={c.id} />}
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
