"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, PhoneCall, Phone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatWonMan } from "@/lib/money";
import { recordPayment } from "@/lib/billing/actions";
import { cn } from "@/lib/utils";

export interface CollectRow {
  invoiceId: string;
  dueDate: string;          // yyyy-mm-dd
  remaining: number;        // 남은 수금액
  status: string;           // unpaid | partial | overdue
  unitLabel: string;        // 건물 · 호
  tenantName: string;
  tenantPhone: string | null;
}

/**
 * 월세 수금 보드 — 이번 달 받아야 할 호실 전부.
 * 전화 돌리기 편하게 연락처를 바로 노출하고, "수금완료" 시 입금일·메모(대리납입 추적)를
 * 남기면 즉시 장부(rent_invoices/payments)에 반영되어 사라집니다.
 */
export function CollectChecklist({ rows, todayIso }: { rows: CollectRow[]; todayIso: string }) {
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();

  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);

  function collect(row: CollectRow, paidAt: string, memo: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("invoice_id", row.invoiceId);
      fd.set("amount", String(row.remaining));
      if (paidAt) fd.set("paid_at", paidAt);
      fd.set("memo", memo || "대시보드 수금");
      const res = await recordPayment(fd);
      if (res.ok) {
        toast.success(`${row.unitLabel} ${formatWonMan(row.remaining)} 수금 완료`);
        setOpenId(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-primary" />
          월세 수금 <span className="text-primary">{rows.length}</span>건
          {totalRemaining > 0 && (
            <span className="text-xs font-normal text-muted-foreground">받을 금액 {formatWonMan(totalRemaining)}</span>
          )}
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/rent">수금·청구 <ArrowRight className="h-3 w-3 ml-1" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 이번 달 받을 월세가 모두 수금되었습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {rows.map((r) => {
              const overdue = r.status === "overdue" || r.dueDate < todayIso;
              const isOpen = openId === r.invoiceId;
              return (
                <li key={r.invoiceId} className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.unitLabel}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                        {r.tenantName}
                        {r.tenantPhone && (
                          <a href={`tel:${r.tenantPhone}`} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                            <Phone className="h-3 w-3" /> {r.tenantPhone}
                          </a>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums shrink-0">{formatWonMan(r.remaining)}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        overdue ? "border-red-300 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700",
                      )}
                    >
                      {overdue ? `연체 ${r.dueDate.slice(5).replace("-", ".")}` : `${r.dueDate.slice(5).replace("-", ".")}`}
                    </Badge>
                    <Button
                      size="sm"
                      variant={isOpen ? "secondary" : "outline"}
                      className="h-8 shrink-0 gap-1"
                      onClick={() => setOpenId(isOpen ? null : r.invoiceId)}
                    >
                      <Wallet className="h-3.5 w-3.5" /> 수금
                    </Button>
                  </div>

                  {isOpen && <CollectForm row={r} pending={pending} todayIso={todayIso} onConfirm={collect} />}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CollectForm({
  row, pending, todayIso, onConfirm,
}: {
  row: CollectRow;
  pending: boolean;
  todayIso: string;
  onConfirm: (row: CollectRow, paidAt: string, memo: string) => void;
}) {
  const [paidAt, setPaidAt] = useState(todayIso);
  const [memo, setMemo] = useState("");

  return (
    <div className="mt-2.5 rounded-lg border bg-muted/30 p-3 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">입금일</label>
          <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">입금자/메모 (대리납입 추적)</label>
          <Input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 본인 입금 / 박성혁 대납"
            className="h-9 text-sm"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        입금자가 임차인 본인이 아니면 메모에 실제 입금자를 적어두세요. 확인 시 {formatWonMan(row.remaining)} 전액이 수금 처리되어 장부에 반영됩니다.
      </p>
      <div className="flex justify-end">
        <Button size="sm" className="h-8 gap-1" disabled={pending} onClick={() => onConfirm(row, paidAt, memo)}>
          <CheckCircle2 className="h-3.5 w-3.5" /> 월세 수금 완료
        </Button>
      </div>
    </div>
  );
}
