"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewInspection } from "../actions";

const OCC: Record<string, string> = { vacant: "공실", occupied: "점유중", recheck: "재확인" };
const MAIL: Record<string, string> = { none: "우편없음", normal: "우편정상", overflow: "우편다량" };
const OPEN: Record<string, string> = { possible: "개문가능", impossible: "개문불가", admin_check: "관리자확인" };
const MERCH: Record<string, string> = { possible: "상품화가능", hold: "상품화보류", impossible: "상품화불가" };

export type ReviewItem = {
  inspection_id: string;
  property_id: string;
  case_number: string;
  address: string;
  owner_name: string | null;
  inspector_name: string;
  occupancy: string | null;
  mail_status: string | null;
  can_open: string | null;
  merchandising_ready: string | null;
  comment: string | null;
};

function Tag({ children, tone }: { children: React.ReactNode; tone?: "green" | "red" | "amber" | "slate" }) {
  const c =
    tone === "green" ? "bg-green-100 text-green-700"
    : tone === "red" ? "bg-red-100 text-red-700"
    : tone === "amber" ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c}`}>{children}</span>;
}

export function ReviewCard({ it }: { it: ReviewItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(action: "APPROVE" | "REQUEST_RECHECK" | "MARK_OCCUPIED" | "REJECT", label: string) {
    let memo: string | undefined;
    if (action === "REQUEST_RECHECK" || action === "REJECT") {
      memo = window.prompt(`${label} 사유 (선택)`) ?? undefined;
    }
    startTransition(async () => {
      const res = await reviewInspection(it.inspection_id, it.property_id, action, memo);
      if (!res.ok) {
        toast.error(res.error ?? "처리 실패");
        return;
      }
      toast.success(`${label} 완료`);
      router.refresh();
    });
  }

  const vacant = it.occupancy === "vacant";

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div>
        <div className="font-mono text-xs font-semibold text-blue-700">{it.case_number}</div>
        <div className="text-sm font-medium line-clamp-1">{it.address}</div>
        <div className="text-xs text-muted-foreground">
          {[it.owner_name, `답사: ${it.inspector_name}`].filter(Boolean).join(" · ")}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {it.occupancy && <Tag tone={vacant ? "green" : "red"}>{OCC[it.occupancy] ?? it.occupancy}</Tag>}
        {it.mail_status && <Tag>{MAIL[it.mail_status] ?? it.mail_status}</Tag>}
        {it.can_open && <Tag tone={it.can_open === "possible" ? "green" : "amber"}>{OPEN[it.can_open] ?? it.can_open}</Tag>}
        {it.merchandising_ready && <Tag tone={it.merchandising_ready === "possible" ? "green" : "slate"}>{MERCH[it.merchandising_ready] ?? it.merchandising_ready}</Tag>}
      </div>

      {it.comment && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{it.comment}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={() => act("APPROVE", "승인")} disabled={pending}>승인</Button>
        <Button size="sm" variant="outline" onClick={() => act("REQUEST_RECHECK", "재확인 요청")} disabled={pending}>재확인</Button>
        <Button size="sm" variant="outline" onClick={() => act("MARK_OCCUPIED", "점유중 표시")} disabled={pending}>점유중</Button>
        <Button size="sm" variant="outline" className="text-red-600" onClick={() => act("REJECT", "제외")} disabled={pending}>제외</Button>
      </div>
    </div>
  );
}
