"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Circle, CheckCircle2, ArrowRight, PhoneCall } from "lucide-react";
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
}

/** 오늘 수금 체크리스트 — 체크하면 전액 입금 처리되고 리스트에서 사라짐 */
export function CollectChecklist({ rows, todayIso }: { rows: CollectRow[]; todayIso: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function collect(row: CollectRow) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("invoice_id", row.invoiceId);
      fd.set("amount", String(row.remaining));
      fd.set("memo", "대시보드 수금 체크");
      const res = await recordPayment(fd);
      if (res.ok) {
        toast.success(`${row.unitLabel} ${formatWonMan(row.remaining)} 수금 완료`);
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
          오늘 수금 <span className="text-primary">{rows.length}</span>건
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/rent">수금·청구 <ArrowRight className="h-3 w-3 ml-1" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 오늘 수금할 건이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const overdue = r.status === "overdue" || r.dueDate < todayIso;
              return (
                <li key={r.invoiceId} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => collect(r)}
                    disabled={pending}
                    className="shrink-0 text-muted-foreground/50 hover:text-primary transition-colors disabled:opacity-40"
                    aria-label="수금 완료 체크"
                    title="체크하면 전액 입금 처리됩니다"
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.unitLabel}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.tenantName}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums shrink-0">{formatWonMan(r.remaining)}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs shrink-0",
                      overdue ? "border-red-300 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700",
                    )}
                  >
                    {overdue ? `연체 ${r.dueDate.slice(5).replace("-", ".")}` : "오늘"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
