"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { issueInvoicesForDate, refreshOverdueInvoices } from "@/lib/billing/actions";

export function RentTriggers() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onIssue() {
    if (!confirm("3일 이내 마감 스케줄을 청구서로 발행하시겠습니까?")) return;
    startTransition(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const r = await issueInvoicesForDate(today);
      if (r.ok) {
        toast.success(`${r.issued}건 발행되었습니다.`);
        router.refresh();
      } else {
        toast.error("발행 실패", { description: r.error });
      }
    });
  }

  function onOverdue() {
    if (!confirm("연체 상태/이자를 갱신하시겠습니까?")) return;
    startTransition(async () => {
      const r = await refreshOverdueInvoices();
      if (r.ok) {
        toast.success(`${r.updated}건 갱신되었습니다.`);
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onIssue} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Zap className="h-4 w-4 mr-1.5" />}
        청구서 발행
      </Button>
      <Button variant="outline" onClick={onOverdue} disabled={pending}>
        연체 갱신
      </Button>
    </div>
  );
}
