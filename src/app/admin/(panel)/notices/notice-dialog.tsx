"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { upsertNotice, deleteNotice } from "./actions";
import type { Notice } from "@/types/database";

interface Props {
  mode: "create" | "edit";
  notice?: Notice;
  properties: { id: string; name: string }[];
}

export function NoticeDialog({ mode, notice, properties }: Props) {
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(notice?.property_id ?? "all");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("property_id", propertyId === "all" ? "" : propertyId);
    startTransition(async () => {
      const r = await upsertNotice(notice?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!notice?.id) return;
    if (!confirm("삭제하시겠습니까?")) return;
    startTransition(async () => {
      const r = await deleteNotice(notice.id);
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
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> 공지 작성</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "공지 작성" : "공지 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>대상 건물</Label>
            <Select value={propertyId} onValueChange={(v) => setPropertyId(v ?? "all")}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 공지 (모든 건물 표시)</SelectItem>
                {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>제목 *</Label>
            <Input name="title" required defaultValue={notice?.title ?? ""} className="mt-1.5" />
          </div>
          <div>
            <Label>내용 *</Label>
            <Textarea name="content" required rows={8} defaultValue={notice?.content ?? ""} className="mt-1.5" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="is_pinned" defaultChecked={notice?.is_pinned ?? false} className="h-4 w-4" />
              고정 공지 (상단 노출)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="is_published" defaultChecked={notice?.is_published ?? true} className="h-4 w-4" />
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
