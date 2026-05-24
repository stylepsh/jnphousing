"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { bulkUpdateInvoiceStatus } from "./actions";

interface Invoice {
  id: string;
  unit_id: string;
  due_date: string;
  amount: number;
  status: string;
  paid_amount: number | null;
  tenants: { name: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  unpaid:  { label: "미납",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  overdue: { label: "연체",   color: "bg-red-100 text-red-700 border-red-200" },
  partial: { label: "부분납", color: "bg-blue-100 text-blue-700 border-blue-200" },
  paid:    { label: "완납",   color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  waived:  { label: "면제",   color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function BulkInvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, setPending] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<string>("waived");

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === invoices.length) setSelected(new Set());
    else setSelected(new Set(invoices.map(i => i.id)));
  }

  async function apply() {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}건의 청구서 상태를 "${STATUS_LABEL[newStatus]?.label}"로 변경하시겠습니까?`)) return;
    setPending(true);
    try {
      const r = await bulkUpdateInvoiceStatus(Array.from(selected), newStatus);
      if (r.ok) {
        toast.success(`${r.updated}건 변경 완료`);
        setSelected(new Set());
      } else toast.error("실패", { description: r.error });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Badge variant="outline">{selected.size}건 선택</Badge>
          <Select value={newStatus} onValueChange={(v) => v && setNewStatus(v)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="waived">면제로 변경</SelectItem>
              <SelectItem value="paid">완납으로 변경</SelectItem>
              <SelectItem value="overdue">연체로 변경</SelectItem>
              <SelectItem value="unpaid">미납으로 복원</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={apply} disabled={selected.size === 0 || pending} loading={pending}>적용</Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>선택 해제</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input type="checkbox" checked={selected.size === invoices.length && invoices.length > 0} onChange={toggleAll} className="h-4 w-4" />
                </TableHead>
                <TableHead>임차인</TableHead>
                <TableHead>마감일</TableHead>
                <TableHead className="text-right">청구액</TableHead>
                <TableHead className="text-right">납부액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(i => {
                const st = STATUS_LABEL[i.status] ?? STATUS_LABEL.unpaid;
                return (
                  <TableRow key={i.id} className={selected.has(i.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="font-medium">{i.tenants?.name ?? "-"}</TableCell>
                    <TableCell className="text-xs">{i.due_date}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{(i.paid_amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
              {invoices.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">미수금 청구서가 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
