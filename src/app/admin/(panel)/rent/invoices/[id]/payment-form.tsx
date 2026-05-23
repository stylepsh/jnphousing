"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { recordPayment } from "@/lib/billing/actions";

export function PaymentForm({ invoiceId, suggested }: { invoiceId: string; suggested: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("invoice_id", invoiceId);
    startTransition(async () => {
      const r = await recordPayment(fd);
      if (r.ok) {
        toast.success(`입금 등록되었습니다.${r.leftover > 0 ? ` (이월 ${r.leftover.toLocaleString()}원)` : ""}`);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label>금액 (원) *</Label>
          <Input type="number" name="amount" required defaultValue={suggested} min={1} className="mt-1.5" />
        </div>
        <div>
          <Label>입금일</Label>
          <Input type="datetime-local" name="paid_at" defaultValue={new Date().toISOString().slice(0, 16)} className="mt-1.5" />
        </div>
        <div>
          <Label>경로</Label>
          <Select name="source" defaultValue="manual">
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">수기 입력</SelectItem>
              <SelectItem value="bank_csv">은행 CSV</SelectItem>
              <SelectItem value="virtual_account">가상계좌</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>메모</Label>
        <Textarea name="memo" rows={2} placeholder="입금자명, 거래내역 등" className="mt-1.5" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="cascade" name="cascade" defaultChecked className="h-4 w-4" />
        <Label htmlFor="cascade" className="text-sm cursor-pointer">초과액은 다음 청구서로 자동 충당</Label>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          입금 등록
        </Button>
      </div>
    </form>
  );
}
