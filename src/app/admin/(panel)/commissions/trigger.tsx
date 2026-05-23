"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { generateMonthlyCommissions } from "@/lib/billing/actions";

export function CommissionTrigger() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const now = new Date();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const year = Number(fd.get("year"));
    const month = Number(fd.get("month"));
    startTransition(async () => {
      const r = await generateMonthlyCommissions(year, month);
      if (r.ok) {
        toast.success(`${r.inserted}건의 수수료가 생성되었습니다.`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Zap className="h-4 w-4 mr-1.5" /> 월별 정산 생성</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>월별 위탁수수료 생성</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>연도</Label>
                <Input type="number" name="year" required defaultValue={now.getFullYear()} className="mt-1.5" />
              </div>
              <div>
                <Label>월</Label>
                <Input type="number" name="month" required min={1} max={12} defaultValue={now.getMonth() + 1} className="mt-1.5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">해당 월에 paid 된 청구서 기준으로 lease 별 수수료를 upsert 합니다.</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                생성
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
