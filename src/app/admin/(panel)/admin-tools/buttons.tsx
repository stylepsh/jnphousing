"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, AlertTriangle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { issueInvoicesForDate, refreshOverdueInvoices, generateMonthlyCommissions } from "@/lib/billing/actions";

export function AdminToolsButtons() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const now = new Date();

  function onIssue() {
    if (!confirm("3일 이내 마감 스케줄을 청구서로 발행하시겠습니까?")) return;
    startTransition(async () => {
      const r = await issueInvoicesForDate(now.toISOString().slice(0, 10));
      if (r.ok) {
        toast.success(`청구서 ${r.issued}건 발행`);
        router.refresh();
      } else toast.error("실패", { description: r.error });
    });
  }

  function onOverdue() {
    if (!confirm("연체 상태/이자를 갱신하시겠습니까?")) return;
    startTransition(async () => {
      const r = await refreshOverdueInvoices();
      if (r.ok) {
        toast.success(`${r.updated}건 갱신`);
        router.refresh();
      } else toast.error("실패", { description: r.error });
    });
  }

  function onCommission() {
    if (!confirm(`${now.getFullYear()}년 ${now.getMonth() + 1}월 위탁수수료를 생성하시겠습니까?`)) return;
    startTransition(async () => {
      const r = await generateMonthlyCommissions(now.getFullYear(), now.getMonth() + 1);
      if (r.ok) {
        toast.success(`수수료 ${r.inserted}건 생성`);
        router.refresh();
      } else toast.error("실패", { description: r.error });
    });
  }

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <Button variant="outline" onClick={onIssue} disabled={pending} className="h-auto py-4 flex-col">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
        <span className="mt-2 font-semibold">청구서 발행</span>
        <span className="text-xs text-muted-foreground">3일 이내 마감</span>
      </Button>
      <Button variant="outline" onClick={onOverdue} disabled={pending} className="h-auto py-4 flex-col">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
        <span className="mt-2 font-semibold">연체 갱신</span>
        <span className="text-xs text-muted-foreground">미납 상태/이자</span>
      </Button>
      <Button variant="outline" onClick={onCommission} disabled={pending} className="h-auto py-4 flex-col">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
        <span className="mt-2 font-semibold">수수료 생성</span>
        <span className="text-xs text-muted-foreground">이번달 기준</span>
      </Button>
    </div>
  );
}
