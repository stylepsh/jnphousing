"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Play, X, RefreshCw, Loader2 } from "lucide-react";
import { activateLease, terminateLease, renewLease } from "@/lib/billing/actions";
import type { Lease } from "@/types/lease";

export function LeaseActions({ lease }: { lease: Lease }) {
  const router = useRouter();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onActivate() {
    if (!confirm("계약을 활성화하고 청구 스케줄을 생성하시겠습니까?")) return;
    startTransition(async () => {
      const r = await activateLease(lease.id);
      if (r.ok) {
        toast.success(`활성화 완료 — ${r.count}건의 청구 스케줄 생성`);
        router.refresh();
      } else {
        toast.error("활성화 실패", { description: r.error });
      }
    });
  }

  function onTerminate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("lease_id", lease.id);
    startTransition(async () => {
      const r = await terminateLease(fd);
      if (r.ok) {
        toast.success("해지 처리되었습니다.", {
          description: `정산: 보증금 ${r.settlement.deposit.toLocaleString()}원 - 미납 ${r.settlement.outstanding.toLocaleString()}원 - 원상복구 ${r.settlement.restore_cost.toLocaleString()}원 = 환급 ${r.settlement.refund.toLocaleString()}원`,
        });
        setTerminateOpen(false);
        router.refresh();
      } else {
        toast.error("해지 실패", { description: r.error });
      }
    });
  }

  function onRenew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("lease_id", lease.id);
    startTransition(async () => {
      const r = await renewLease(fd);
      if (r.ok) {
        toast.success("갱신 완료");
        setRenewOpen(false);
        router.push(`/admin/leases/${r.new_lease_id}`);
      } else {
        toast.error("갱신 실패", { description: r.error });
      }
    });
  }

  const canActivate = lease.status === "draft" || lease.status === "active";
  const canTerminate = ["active", "expiring", "draft"].includes(lease.status);
  const canRenew = ["active", "expiring", "expired"].includes(lease.status);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canActivate && (
          <Button onClick={onActivate} disabled={pending}>
            <Play className="h-4 w-4 mr-1.5" />
            {lease.status === "active" ? "스케줄 재생성" : "활성화"}
          </Button>
        )}
        {canRenew && (
          <Button variant="outline" onClick={() => setRenewOpen(true)} disabled={pending}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> 갱신
          </Button>
        )}
        {canTerminate && (
          <Button variant="outline" onClick={() => setTerminateOpen(true)} disabled={pending} className="text-destructive border-destructive/40">
            <X className="h-4 w-4 mr-1.5" /> 해지
          </Button>
        )}
      </div>

      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계약 해지</DialogTitle>
            <DialogDescription>해지일 이후 청구 스케줄은 삭제되며, 보증금 정산 시뮬레이션이 기록됩니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onTerminate} className="space-y-3">
            <div>
              <Label>해지일</Label>
              <Input type="date" name="termination_date" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1.5" />
            </div>
            <div>
              <Label>원상복구비 (원)</Label>
              <Input type="number" name="restore_cost" defaultValue={0} className="mt-1.5" />
            </div>
            <div>
              <Label>사유</Label>
              <Textarea name="reason" rows={3} className="mt-1.5" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTerminateOpen(false)}>취소</Button>
              <Button type="submit" disabled={pending} className="bg-destructive hover:bg-destructive/90">
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                해지 처리
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계약 갱신</DialogTitle>
            <DialogDescription>새 계약이 생성되고 이 계약은 renewed 상태로 전환됩니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onRenew} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>새 시작일 *</Label>
                <Input type="date" name="new_start_date" required className="mt-1.5" />
              </div>
              <div>
                <Label>새 종료일 *</Label>
                <Input type="date" name="new_end_date" required className="mt-1.5" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>새 보증금 (옵션)</Label>
                <Input type="number" name="new_deposit" placeholder={String(lease.deposit)} className="mt-1.5" />
              </div>
              <div>
                <Label>새 월세 (옵션)</Label>
                <Input type="number" name="new_rent_amount" placeholder={String(lease.rent_amount)} className="mt-1.5" />
              </div>
              <div>
                <Label>새 관리비 (옵션)</Label>
                <Input type="number" name="new_management_fee" placeholder={String(lease.management_fee)} className="mt-1.5" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenewOpen(false)}>취소</Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                갱신 생성
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
