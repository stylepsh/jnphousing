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
import { upsertProperty, deleteProperty } from "./actions";
import type { Property } from "@/types/database";

interface Props {
  mode: "create" | "edit";
  property?: Property;
}

export function PropertyDialog({ mode, property }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>(property?.type ?? "officetel");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("type", type);
    startTransition(async () => {
      const r = await upsertProperty(property?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
        form.reset();
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!property?.id) return;
    if (!confirm(`${property.name} 을(를) 삭제하시겠습니까? 관련 공실 매물도 함께 삭제됩니다.`)) return;
    startTransition(async () => {
      const r = await deleteProperty(property.id);
      if (r.ok) {
        toast.success("삭제되었습니다.");
        setOpen(false);
      } else {
        toast.error("삭제 실패", { description: r.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> 신규 등록
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "관리현장 등록" : "관리현장 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>건물명 *</Label>
              <Input name="name" required defaultValue={property?.name ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>유형 *</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "officetel")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="officetel">오피스텔</SelectItem>
                  <SelectItem value="apartment">아파트</SelectItem>
                  <SelectItem value="villa">빌라</SelectItem>
                  <SelectItem value="commercial">상가</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>주소 *</Label>
            <Input name="address" required defaultValue={property?.address ?? ""} className="mt-1.5" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>총 세대수</Label>
              <Input type="number" name="total_units" defaultValue={property?.total_units ?? 0} className="mt-1.5" />
            </div>
            <div>
              <Label>표시 순서</Label>
              <Input type="number" name="display_order" defaultValue={property?.display_order ?? 0} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>썸네일 URL</Label>
            <Input name="thumbnail_url" defaultValue={property?.thumbnail_url ?? ""} placeholder="https://..." className="mt-1.5" />
          </div>
          <div>
            <Label>건물 설명</Label>
            <Textarea name="description" defaultValue={property?.description ?? ""} rows={4} className="mt-1.5" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`pub-${property?.id ?? "new"}`}
              name="is_published"
              defaultChecked={property?.is_published ?? true}
              className="h-4 w-4"
            />
            <Label htmlFor={`pub-${property?.id ?? "new"}`} className="text-sm cursor-pointer">공개</Label>
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
                {mode === "create" ? "등록" : "저장"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
