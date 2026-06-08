"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAction } from "./actions";
import type { PipelineAction } from "@/lib/auction/pipeline/state-machine";

type Btn = {
  action: PipelineAction;
  label: string;
  variant?: "default" | "outline";
  danger?: boolean;
  confirm?: string;
  promptReason?: boolean;
};

/** 범용 단순 전이 버튼 묶음 (임대중/점유보관 등) */
export function PipelineActions({ propertyId, buttons }: { propertyId: string; buttons: Btn[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(b: Btn) {
    if (b.confirm && !window.confirm(b.confirm)) return;
    const reason = b.promptReason ? window.prompt(`${b.label} 사유 (선택)`) ?? undefined : undefined;
    startTransition(async () => {
      const res = await runAction(propertyId, b.action, reason);
      if (!res.ok) {
        toast.error(res.error ?? "처리 실패");
        return;
      }
      toast.success(`${b.label} 완료`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {buttons.map((b) => (
        <Button
          key={b.action}
          size="sm"
          variant={b.variant ?? "outline"}
          className={b.danger ? "text-red-600" : undefined}
          onClick={() => run(b)}
          disabled={pending}
        >
          {b.label}
        </Button>
      ))}
    </div>
  );
}
