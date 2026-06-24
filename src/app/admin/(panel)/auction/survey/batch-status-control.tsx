"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setBatchStatus } from "./survey-actions";

interface Props {
  batchId: string;
  status: "created" | "assigned" | "in_progress" | "completed";
}

export function BatchStatusControl({ batchId, status }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick(target: "assigned" | "in_progress" | "completed") {
    startTransition(async () => {
      const res = await setBatchStatus(batchId, target);
      if (res.ok) {
        const labels: Record<string, string> = {
          assigned: "현장배포",
          in_progress: "처리중",
          completed: "마감",
        };
        toast.success(`배치 상태를 "${labels[target]}"(으)로 변경했습니다.`);
        router.refresh();
      } else {
        toast.error(res.error ?? "상태 변경 실패");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      {status === "created" && (
        <button
          disabled={pending}
          onClick={() => handleClick("assigned")}
          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          현장배포
        </button>
      )}
      {status !== "completed" && (
        <button
          disabled={pending}
          onClick={() => handleClick("completed")}
          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
        >
          마감
        </button>
      )}
      {status === "completed" && (
        <button
          disabled={pending}
          onClick={() => handleClick("in_progress")}
          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors"
        >
          재개
        </button>
      )}
    </div>
  );
}
