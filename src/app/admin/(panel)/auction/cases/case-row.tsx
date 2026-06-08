"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ExternalLink } from "lucide-react";
import { AUCTION_STAGE, AUCTION_STAGE_ORDER, AUCTION_STAGE_COLOR, formatWon, type AuctionStage } from "@/lib/auction/case-stages";
import { updateCaseStage, deleteCase } from "./actions";
import { cn } from "@/lib/utils";

export type CaseRowData = {
  id: string;
  case_number: string;
  court: string | null;
  case_type: string | null;
  stage: string;
  property_label: string | null;
  auction_date: string | null;
  dividend_deadline: string | null;
  appraisal_value: number | null;
  minimum_bid: number | null;
  claim_amount: number | null;
  tenant_response: string | null;
  assigned_lawyer: string | null;
  lawyer_contact: string | null;
  auction_url: string | null;
};

export function CaseRow({ c }: { c: CaseRowData }) {
  const router = useRouter();
  const [stage, setStage] = useState(c.stage);
  const [pending, startTransition] = useTransition();
  const color = AUCTION_STAGE_COLOR[stage as AuctionStage] ?? "bg-slate-100 text-slate-600";

  function changeStage(next: string) {
    const prev = stage;
    setStage(next);
    startTransition(async () => {
      const res = await updateCaseStage(c.id, next);
      if (!res.ok) {
        setStage(prev);
        toast.error(res.error ?? "단계 변경 실패");
        return;
      }
      toast.success(`단계 → ${AUCTION_STAGE[next as AuctionStage] ?? next}`);
    });
  }

  function remove() {
    if (!confirm(`사건번호 ${c.case_number} 을(를) 삭제할까요?`)) return;
    startTransition(async () => {
      const res = await deleteCase(c.id);
      if (!res.ok) {
        toast.error(res.error ?? "삭제 실패");
        return;
      }
      toast.success("삭제되었습니다.");
      router.refresh();
    });
  }

  return (
    <tr className={cn("border-b hover:bg-muted/40 align-top", pending && "opacity-50")}>
      <td className="px-3 py-2.5">
        <div className="font-mono text-sm font-semibold flex items-center gap-1">
          {c.case_number}
          {c.auction_url && (
            <a href={c.auction_url} target="_blank" rel="noreferrer" className="text-blue-600">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        {c.case_type && <div className="text-xs text-muted-foreground">{c.case_type}</div>}
      </td>
      <td className="px-3 py-2.5 text-sm max-w-[220px]">
        <div className="line-clamp-2">{c.property_label ?? "-"}</div>
        {c.court && <div className="text-xs text-muted-foreground">{c.court}</div>}
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
        <div>매각 {c.auction_date ?? "-"}</div>
        <div className="text-muted-foreground">배당 {c.dividend_deadline ?? "-"}</div>
      </td>
      <td className="px-3 py-2.5">
        <select
          value={stage}
          onChange={(e) => changeStage(e.target.value)}
          disabled={pending}
          className={cn("text-xs font-bold rounded-full px-2.5 py-1 border-0 cursor-pointer", color)}
        >
          {AUCTION_STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {AUCTION_STAGE[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
        <div>감정 {formatWon(c.appraisal_value)}</div>
        <div className="text-muted-foreground">최저 {formatWon(c.minimum_bid)}</div>
        {c.claim_amount != null && <div className="text-red-600">채권 {formatWon(c.claim_amount)}</div>}
      </td>
      <td className="px-3 py-2.5 text-xs max-w-[140px]">
        <div className="line-clamp-2">{c.tenant_response ?? "-"}</div>
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
        <div>{c.assigned_lawyer ?? "-"}</div>
        {c.lawyer_contact && <div className="text-muted-foreground">{c.lawyer_contact}</div>}
      </td>
      <td className="px-3 py-2.5 text-right">
        <button onClick={remove} disabled={pending} className="text-muted-foreground hover:text-red-600 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
