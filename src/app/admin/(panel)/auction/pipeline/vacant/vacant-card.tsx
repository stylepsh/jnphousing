"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAction, addWorkItem, moveAuctionStage } from "../actions";
import { formatWon } from "@/lib/auction/case-stages";
import type { PipelineAction } from "@/lib/auction/pipeline/state-machine";

const MOVE_TARGETS = [
  ["Approved", "승인"],
  ["WorkPrep", "상품화준비"],
  ["Merchandising", "상품화진행"],
  ["Available", "임대가능"],
] as const;

export type VacantItem = {
  id: string;
  case_number: string;
  address: string;
  owner_name: string | null;
  pipeline_state: string;
  total_work_cost: number | null;
  pipeline_entered_at: string | null;
};

const NEXT: Record<string, { action: PipelineAction; label: string } | undefined> = {
  Approved: { action: "START_WORK_PREP", label: "상품화 준비 시작" },
  WorkPrep: { action: "START_MERCHANDISING", label: "상품화 진행" },
  Merchandising: { action: "COMPLETE_MERCHANDISING", label: "상품화 완료 → 임대가능" },
};

const WORK_CATEGORIES = [
  ["wallpaper", "도배"],
  ["flooring", "바닥"],
  ["cleaning", "청소"],
  ["repair", "수리"],
  ["appliance", "가전"],
  ["key", "도어락"],
  ["photo", "사진"],
  ["etc", "기타"],
] as const;

function SlaBadge({ enteredAt }: { enteredAt: string | null }) {
  if (!enteredAt) return null;
  const days = Math.floor((Date.now() - new Date(enteredAt).getTime()) / 86_400_000);
  const cls =
    days > 14
      ? "bg-rose-50 text-rose-700"
      : days >= 8
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`}>
      {days}일 경과
    </span>
  );
}

export function VacantCard({ it }: { it: VacantItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showWork, setShowWork] = useState(false);
  const [cat, setCat] = useState("repair");
  const [amount, setAmount] = useState("");

  const next = NEXT[it.pipeline_state];
  const canAddWork = it.pipeline_state === "WorkPrep" || it.pipeline_state === "Merchandising" || it.pipeline_state === "Approved";

  function advance() {
    if (!next) return;
    startTransition(async () => {
      const res = await runAction(it.id, next.action);
      if (!res.ok) {
        toast.error(res.error ?? "처리 실패");
        return;
      }
      toast.success(next.label);
      router.refresh();
    });
  }

  function moveTo(target: string) {
    startTransition(async () => {
      const res = await moveAuctionStage(it.id, target);
      if (!res.ok) {
        toast.error(res.error ?? "이동 실패");
        return;
      }
      toast.success("단계 이동됨");
      router.refresh();
    });
  }

  function softDelete() {
    if (!window.confirm("이 물건을 목록에서 제외할까요? (복구 가능)")) return;
    startTransition(async () => {
      const res = await moveAuctionStage(it.id, "Rejected");
      if (!res.ok) {
        toast.error(res.error ?? "제외 실패");
        return;
      }
      toast.success("목록에서 제외됨");
      router.refresh();
    });
  }

  function saveWork() {
    const amt = Number(amount.replace(/[^\d]/g, ""));
    if (!amt || amt <= 0) {
      toast.error("금액을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await addWorkItem({ propertyId: it.id, category: cat, amount: amt });
      if (!res.ok) {
        toast.error(res.error ?? "추가 실패");
        return;
      }
      toast.success("작업비 추가됨");
      setAmount("");
      setShowWork(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-card p-3.5 space-y-2.5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-xs font-semibold text-blue-700">{it.case_number}</div>
          <SlaBadge enteredAt={it.pipeline_entered_at} />
        </div>
        <div className="text-sm line-clamp-1">{it.address}</div>
        <div className="text-xs text-muted-foreground">{it.owner_name ?? "-"}</div>
      </div>

      <div className="text-xs">
        상품화 누적비용 <strong className="text-foreground">{formatWon(it.total_work_cost ?? 0)}</strong>
      </div>

      {showWork && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 p-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
            {WORK_CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액(원)" className="h-8 w-28 text-xs" />
          <Button size="sm" onClick={saveWork} disabled={pending}>저장</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) moveTo(e.target.value);
          }}
          disabled={pending}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="">단계 이동…</option>
          {MOVE_TARGETS.filter(([v]) => v !== it.pipeline_state).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={softDelete}
          disabled={pending}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          삭제
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {next && (
          <Button size="sm" onClick={advance} disabled={pending}>{next.label}</Button>
        )}
        {it.pipeline_state === "Available" && (
          <Button size="sm" onClick={() => router.push("/admin/auction/pipeline/lease-ready")}>임대 계약 →</Button>
        )}
        {canAddWork && (
          <Button size="sm" variant="outline" onClick={() => setShowWork((v) => !v)} disabled={pending}>
            <Plus className="w-3.5 h-3.5 mr-1" /> 작업비
          </Button>
        )}
      </div>
    </div>
  );
}
