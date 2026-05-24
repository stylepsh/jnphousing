"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { upsertMilestone, deleteMilestone } from "./actions";

interface Milestone {
  id: string;
  year: number;
  month: number | null;
  title: string;
  description: string | null;
  display_order: number;
  is_published: boolean;
}

export function MilestoneDialog({ mode, milestone }: { mode: "create" | "edit"; milestone?: Milestone }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await upsertMilestone(milestone?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!milestone?.id) return;
    if (!confirm("이 연혁 항목을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const r = await deleteMilestone(milestone.id);
      if (r.ok) { toast.success("삭제되었습니다."); setOpen(false); }
      else toast.error("실패", { description: r.error });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> 연혁 추가</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "연혁 추가" : "연혁 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>연도 *</Label>
              <Input name="year" type="number" required defaultValue={milestone?.year ?? new Date().getFullYear()} className="mt-1.5" />
            </div>
            <div>
              <Label>월 <span className="text-xs text-muted-foreground">(선택)</span></Label>
              <Input name="month" type="number" min="1" max="12" defaultValue={milestone?.month ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>순서</Label>
              <Input name="display_order" type="number" defaultValue={milestone?.display_order ?? 0} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>제목 *</Label>
            <Input name="title" required defaultValue={milestone?.title ?? ""} className="mt-1.5" placeholder="예: 위탁임대관리 본격화" />
          </div>

          <div>
            <Label>설명</Label>
            <Textarea name="description" rows={4} defaultValue={milestone?.description ?? ""} className="mt-1.5" placeholder="이 시기에 있었던 핵심 활동·성과 등" />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="is_published" defaultChecked={milestone?.is_published ?? true} className="h-4 w-4" />
            공개
          </label>

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
