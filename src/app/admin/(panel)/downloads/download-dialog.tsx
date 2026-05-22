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
import { upsertDownload, deleteDownload } from "./actions";
import type { Download } from "@/types/database";

interface Props {
  mode: "create" | "edit";
  download?: Download;
}

export function DownloadDialog({ mode, download }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(download?.category ?? "contract");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("category", category);
    startTransition(async () => {
      const r = await upsertDownload(download?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!download?.id) return;
    if (!confirm("삭제하시겠습니까?")) return;
    startTransition(async () => {
      const r = await deleteDownload(download.id);
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
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> 서류 등록</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "서류 등록" : "서류 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>카테고리 *</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v as "contract" | "guide" | "form")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">계약서</SelectItem>
                  <SelectItem value="guide">안내문</SelectItem>
                  <SelectItem value="form">서식</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>버전 (예: 1.0)</Label>
              <Input name="version" defaultValue={download?.version ?? ""} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>제목 *</Label>
            <Input name="title" required defaultValue={download?.title ?? ""} className="mt-1.5" />
          </div>
          <div>
            <Label>설명</Label>
            <Textarea name="description" rows={2} defaultValue={download?.description ?? ""} className="mt-1.5" />
          </div>
          <div>
            <Label>파일 URL *</Label>
            <Input name="file_url" required type="url" placeholder="https://...supabase.co/storage/v1/object/public/downloads/..." defaultValue={download?.file_url ?? ""} className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              Supabase Storage downloads 버킷에 파일 업로드 후 Public URL 을 복사해 붙여넣으세요.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>파일 크기 (KB)</Label>
              <Input type="number" name="file_size_kb" defaultValue={download?.file_size_kb ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>표시 순서</Label>
              <Input type="number" name="display_order" defaultValue={download?.display_order ?? 0} className="mt-1.5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`pub-${download?.id ?? "new"}`} name="is_published" defaultChecked={download?.is_published ?? true} className="h-4 w-4" />
            <Label htmlFor={`pub-${download?.id ?? "new"}`} className="text-sm cursor-pointer">공개</Label>
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
