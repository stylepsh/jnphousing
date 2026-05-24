"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { upsertCert, deleteCert } from "./actions";

interface Cert {
  id: string;
  title: string;
  issuer: string | null;
  issued_date: string | null;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
}

export function CertDialog({ mode, cert }: { mode: "create" | "edit"; cert?: Cert }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await upsertCert(cert?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else toast.error("저장 실패", { description: r.error });
    });
  }

  function onDelete() {
    if (!cert?.id) return;
    if (!confirm("이 인증서를 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const r = await deleteCert(cert.id);
      if (r.ok) { toast.success("삭제되었습니다."); setOpen(false); }
      else toast.error("실패", { description: r.error });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> 인증서 추가</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "인증서 등록" : "인증서 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>제목 *</Label>
            <Input name="title" required defaultValue={cert?.title ?? ""} className="mt-1.5" placeholder="예: 사업자등록증 / HUG 협력업체 인증" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>발급기관</Label>
              <Input name="issuer" defaultValue={cert?.issuer ?? ""} className="mt-1.5" placeholder="예: 부천세무서" />
            </div>
            <div>
              <Label>발급일</Label>
              <Input name="issued_date" type="date" defaultValue={cert?.issued_date?.slice(0, 10) ?? ""} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>이미지 URL <span className="text-xs text-muted-foreground">(Supabase Storage 또는 외부)</span></Label>
            <Input name="image_url" defaultValue={cert?.image_url ?? ""} className="mt-1.5" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>표시 순서</Label>
              <Input name="display_order" type="number" defaultValue={cert?.display_order ?? 0} className="mt-1.5" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mt-7">
              <input type="checkbox" name="is_published" defaultChecked={cert?.is_published ?? true} className="h-4 w-4" />
              공개
            </label>
          </div>
          <DialogFooter className="flex !justify-between">
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
