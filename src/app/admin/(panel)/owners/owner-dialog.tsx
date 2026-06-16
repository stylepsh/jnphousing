"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { upsertOwner, deleteOwner } from "./actions";

export interface SafeOwner {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  account_bank: string | null;
  account_holder: string | null;
  business_name: string | null;
  business_number: string | null;
  representative: string | null;
  memo: string | null;
}

interface Props {
  mode: "create" | "edit";
  owner?: SafeOwner;
}

export function OwnerDialog({ mode, owner }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await upsertOwner(owner?.id ?? null, fd);
      if (r.ok) {
        setOpen(false);
        if (mode === "create" && r.id) {
          // 바로 상세로 이동 → 끊김 없이 건물·호실 등록 시작
          toast.success("소유주 등록 완료 — 이어서 건물·호실을 등록하세요.");
          router.push(`/admin/owners/${r.id}`);
        } else {
          toast.success("수정되었습니다.");
          router.refresh();
        }
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!owner?.id) return;
    if (!confirm(`${owner.name} 소유주를 삭제하시겠습니까? (소유 물건의 연결은 해제됩니다)`)) return;
    startTransition(async () => {
      const r = await deleteOwner(owner.id);
      if (r.ok) {
        toast.success("삭제되었습니다.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> 소유주 등록</Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5" /> 기본정보 수정</Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "소유주(임대인) 등록" : "소유주(임대인) 기본정보 수정"}</DialogTitle>
          <DialogDescription>우리 회사에 운영을 맡긴 소유주(임대인) 기본정보·계좌·사업자 정보. 계좌번호는 암호화 저장됩니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">이름 *</Label>
              <Input name="name" defaultValue={owner?.name ?? ""} required className="h-11 text-base" />
            </div>
            <div>
              <Label className="mb-1.5 block">연락처</Label>
              <Input name="phone" defaultValue={owner?.phone ?? ""} placeholder="010-0000-0000" className="h-11 text-base" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">이메일</Label>
            <Input name="email" type="email" defaultValue={owner?.email ?? ""} className="h-11 text-base" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1.5 block">은행</Label>
              <Input name="account_bank" defaultValue={owner?.account_bank ?? ""} className="h-11 text-base" />
            </div>
            <div>
              <Label className="mb-1.5 block">예금주</Label>
              <Input name="account_holder" defaultValue={owner?.account_holder ?? ""} className="h-11 text-base" />
            </div>
            <div>
              <Label className="mb-1.5 block">계좌번호</Label>
              <Input name="account_number" placeholder={owner ? "변경 시에만 입력" : ""} className="h-11 text-base" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1.5 block">사업자명</Label>
              <Input name="business_name" defaultValue={owner?.business_name ?? ""} className="h-11 text-base" />
            </div>
            <div>
              <Label className="mb-1.5 block">사업자번호</Label>
              <Input name="business_number" defaultValue={owner?.business_number ?? ""} className="h-11 text-base" />
            </div>
            <div>
              <Label className="mb-1.5 block">대표자</Label>
              <Input name="representative" defaultValue={owner?.representative ?? ""} className="h-11 text-base" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">메모</Label>
            <Textarea name="memo" rows={2} defaultValue={owner?.memo ?? ""} className="text-base" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {mode === "edit" && (
              <Button type="button" variant="ghost" className="mr-auto text-destructive gap-1" onClick={onDelete} disabled={pending}>
                <Trash2 className="h-4 w-4" /> 삭제
              </Button>
            )}
            <Button type="submit" disabled={pending} className="gap-1">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "등록" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
