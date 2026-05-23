"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { upsertTenant, deleteTenant } from "./actions";
import type { Tenant } from "@/types/lease";

export function TenantDialog({ mode, tenant }: { mode: "create" | "edit"; tenant?: Tenant }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await upsertTenant(tenant?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!tenant?.id) return;
    if (!confirm(`${tenant.name} 임차인을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const r = await deleteTenant(tenant.id);
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
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> 임차인 등록</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> 편집</Button>
      )}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "임차인 등록" : "임차인 수정"}</DialogTitle>
          <DialogDescription>주민번호·연락처는 권한 있는 관리자에게만 표시됩니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>이름 *</Label>
              <Input name="name" required defaultValue={tenant?.name ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>연락처 *</Label>
              <Input name="phone" required defaultValue={tenant?.phone ?? ""} placeholder="010-1234-5678" className="mt-1.5" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>주민등록번호</Label>
              <Input name="id_number" placeholder="(변경 시에만 입력)" className="mt-1.5" />
            </div>
            <div>
              <Label>비상연락처</Label>
              <Input name="emergency_contact" defaultValue={tenant?.emergency_contact ?? ""} className="mt-1.5" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>입주일</Label>
              <Input type="date" name="move_in_date" defaultValue={tenant?.move_in_date ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>퇴거일</Label>
              <Input type="date" name="move_out_date" defaultValue={tenant?.move_out_date ?? ""} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>메모</Label>
            <Textarea name="memo" rows={2} defaultValue={tenant?.memo ?? ""} className="mt-1.5" />
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
