"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface LeaseRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRent: number;
  currentDeposit: number;
  currentEndDate: string;
  onConfirm: (next: { newRent: number; newDeposit: number; newEndDate: string }) => Promise<void> | void;
  /** 인상률 % (예: 5) */
  defaultIncreasePct?: number;
  /** 갱신 기간 개월 (기본 12) */
  renewalMonths?: number;
}

export function LeaseRenewalDialog({
  open,
  onOpenChange,
  currentRent,
  currentDeposit,
  currentEndDate,
  onConfirm,
  defaultIncreasePct = 5,
  renewalMonths = 12,
}: LeaseRenewalDialogProps) {
  const [pct, setPct] = React.useState(defaultIncreasePct);
  const [depositChange, setDepositChange] = React.useState(0);
  const [pending, setPending] = React.useState(false);

  const newRent = Math.round(currentRent * (1 + pct / 100));
  const newDeposit = Math.max(0, currentDeposit + depositChange);
  const endDate = new Date(currentEndDate);
  endDate.setMonth(endDate.getMonth() + renewalMonths);
  const newEndDate = endDate.toISOString().slice(0, 10);

  async function submit() {
    setPending(true);
    try {
      await onConfirm({ newRent, newDeposit, newEndDate });
      toast.success("계약 갱신 완료");
      onOpenChange(false);
    } catch (e) {
      toast.error("갱신 실패", { description: String(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            계약 갱신 협의
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-lg bg-slate-50 border border-border/60 p-4 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">현재 만료일</span><span className="font-semibold tabular-nums">{currentEndDate}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">현재 보증금</span><span className="font-semibold tabular-nums">{currentDeposit.toLocaleString()}원</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">현재 월세</span><span className="font-semibold tabular-nums">{currentRent.toLocaleString()}원</span></div>
          </div>

          <div>
            <Label className="text-sm">월세 인상률 (%)</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                type="number"
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                step="0.5"
                min={-10}
                max={20}
                className="w-24"
              />
              <div className="flex flex-1 gap-1">
                {[0, 3, 5, 7, 10].map(p => (
                  <button key={p} type="button" onClick={() => setPct(p)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary">
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm">보증금 변동 (원)</Label>
            <Input type="number" value={depositChange} onChange={(e) => setDepositChange(Number(e.target.value))} step="1000000" className="mt-1.5" />
            <p className="mt-1 text-[10px] text-muted-foreground">예: 1000000 입력 = 100만원 증액, 음수 가능</p>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-bold text-primary mb-2">
              <TrendingUp className="h-4 w-4" />
              갱신 후 조건
            </div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">새 만료일</span><span className="font-bold tabular-nums">{newEndDate}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">새 보증금</span><span className="font-bold tabular-nums">{newDeposit.toLocaleString()}원</span></div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">새 월세</span>
              <span className="font-bold tabular-nums">
                {newRent.toLocaleString()}원
                <span className="ml-1 text-xs text-emerald-600">+{(newRent - currentRent).toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>취소</Button>
          <Button onClick={submit} loading={pending}>갱신 적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
