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
import { upsertFaq, deleteFaq } from "./actions";

interface FaqRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
  is_published: boolean;
}

interface Props {
  mode: "create" | "edit";
  faq?: FaqRow;
}

export function FaqDialog({ mode, faq }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(faq?.category ?? "general");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("category", category);
    startTransition(async () => {
      const r = await upsertFaq(faq?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!faq?.id) return;
    if (!confirm(`"${faq.question}" 항목을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const r = await deleteFaq(faq.id);
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
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> FAQ 추가</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "FAQ 등록" : "FAQ 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>카테고리</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="housing">주택관리</SelectItem>
                  <SelectItem value="rental">위탁임대</SelectItem>
                  <SelectItem value="dispute">분쟁·HUG</SelectItem>
                  <SelectItem value="contract">계약</SelectItem>
                  <SelectItem value="payment">임대료·정산</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>표시 순서 <span className="text-xs text-muted-foreground">(작을수록 위)</span></Label>
              <Input name="display_order" type="number" defaultValue={faq?.display_order ?? 0} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>질문 *</Label>
            <Input name="question" required defaultValue={faq?.question ?? ""} className="mt-1.5" placeholder="예: 위탁임대 수수료는 어떻게 책정되나요?" />
          </div>

          <div>
            <Label>답변 *</Label>
            <Textarea
              name="answer"
              required
              rows={8}
              defaultValue={faq?.answer ?? ""}
              className="mt-1.5"
              placeholder="줄바꿈은 그대로 표시됩니다. 자세하고 친절하게 답변해 주세요."
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="is_published" defaultChecked={faq?.is_published ?? true} className="h-4 w-4" />
            공개 (사용자에게 노출)
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
