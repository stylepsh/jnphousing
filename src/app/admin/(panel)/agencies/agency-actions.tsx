"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { approveAgency, rejectAgency } from "./actions";

export function AgencyActions({ agencyId, companyName }: { agencyId: string; companyName: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function onApprove() {
    if (!confirm(`${companyName} 가입을 승인하시겠습니까?`)) return;
    startTransition(async () => {
      const r = await approveAgency(agencyId);
      if (r.ok) toast.success("승인되었습니다.");
      else toast.error("승인 실패", { description: r.error });
    });
  }

  function onReject() {
    startTransition(async () => {
      const r = await rejectAgency(agencyId, reason);
      if (r.ok) {
        toast.success("거절 처리되었습니다.");
        setRejectOpen(false);
        setReason("");
      } else {
        toast.error("거절 실패", { description: r.error });
      }
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} disabled={pending} className="flex-1">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 승인
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)} disabled={pending} className="flex-1">
          <XCircle className="h-3.5 w-3.5 mr-1" /> 거절
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가입 거절</DialogTitle>
            <DialogDescription>
              {companyName} 가입을 거절합니다. 사유를 입력해 주세요. (회원에게 표시됩니다.)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 사업자 정보 확인 불가, 영업 지역 외 등"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>취소</Button>
            <Button onClick={onReject} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              거절 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
