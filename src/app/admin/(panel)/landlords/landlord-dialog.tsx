"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { upsertLandlord, deleteLandlord } from "./actions";
import type { Landlord } from "@/types/lease";

interface Props {
  mode: "create" | "edit";
  landlord?: Landlord;
}

export function LandlordDialog({ mode, landlord }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await upsertLandlord(landlord?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!landlord?.id) return;
    if (!confirm(`${landlord.name} 임대인을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const r = await deleteLandlord(landlord.id);
      if (r.ok) {
        toast.success("삭제되었습니다.");
        setOpen(false);
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> 임대인 등록</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> 편집</Button>
      )}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "임대인 등록" : "임대인 수정"}</DialogTitle>
          <DialogDescription>계좌·사업자번호는 암호화 저장되며 목록에는 마스킹 표시됩니다. 수정 시 빈칸으로 두면 기존 값이 유지됩니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>이름 *</Label>
              <Input name="name" required defaultValue={landlord?.name ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>연락처 *</Label>
              <Input name="phone" required defaultValue={landlord?.phone ?? ""} placeholder="010-1234-5678" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>이메일</Label>
            <Input name="email" type="email" defaultValue={landlord?.email ?? ""} className="mt-1.5" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>은행</Label>
              <Input name="account_bank" defaultValue={landlord?.account_bank ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>예금주</Label>
              <Input name="account_holder" defaultValue={landlord?.account_holder ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>계좌번호</Label>
              <Input
                name="account_number"
                defaultValue={mode === "edit" ? "" : ""}
                placeholder={mode === "edit" ? "(변경 시에만 입력)" : ""}
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>사업자번호</Label>
            <Input name="business_number" placeholder="123-45-67890" className="mt-1.5" />
          </div>
          <div>
            <Label>메모</Label>
            <Textarea name="memo" rows={2} defaultValue={landlord?.memo ?? ""} className="mt-1.5" />
          </div>
          <DialogFooter className="flex !justify-between pt-2">
            {mode === "edit" ? (
              <Button type="button" variant="ghost" onClick={onDelete} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> 삭제
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                저장
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
