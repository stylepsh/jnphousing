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
import { upsertNewsPost, deleteNewsPost } from "./actions";

interface NewsPost {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  is_pinned: boolean;
  is_published: boolean;
}

interface Props {
  mode: "create" | "edit";
  post?: NewsPost;
}

export function NewsDialog({ mode, post }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(post?.category ?? "general");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("category", category);
    startTransition(async () => {
      const r = await upsertNewsPost(post?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "등록되었습니다." : "수정되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!post?.id) return;
    if (!confirm(`"${post.title}" 글을 삭제하시겠습니까?\n복구할 수 없습니다.`)) return;
    startTransition(async () => {
      const r = await deleteNewsPost(post.id);
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
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> 새 글 작성
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "공지사항 작성" : "공지사항 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label>제목 *</Label>
              <Input name="title" required defaultValue={post?.title ?? ""} className="mt-1.5" placeholder="예: 5월 정기점검 안내" />
            </div>
            <div>
              <Label>카테고리</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="press">보도</SelectItem>
                  <SelectItem value="update">업데이트</SelectItem>
                  <SelectItem value="holiday">휴무</SelectItem>
                  <SelectItem value="important">중요</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>URL slug <span className="text-xs text-muted-foreground">(비우면 자동 생성)</span></Label>
            <Input name="slug" defaultValue={post?.slug ?? ""} className="mt-1.5" placeholder="예: may-inspection-2026" />
          </div>

          <div>
            <Label>요약 <span className="text-xs text-muted-foreground">(목록에 표시되는 한 줄)</span></Label>
            <Input name="excerpt" defaultValue={post?.excerpt ?? ""} className="mt-1.5" placeholder="간단한 요약 (300자 이내)" maxLength={300} />
          </div>

          <div>
            <Label>내용 *</Label>
            <Textarea
              name="content"
              required
              rows={12}
              defaultValue={post?.content ?? ""}
              className="mt-1.5 font-mono text-sm"
              placeholder="줄바꿈은 그대로 표시됩니다. 자세한 내용을 자유롭게 작성하세요."
            />
          </div>

          <div>
            <Label>커버 이미지 URL <span className="text-xs text-muted-foreground">(선택)</span></Label>
            <Input name="cover_image_url" defaultValue={post?.cover_image_url ?? ""} className="mt-1.5" placeholder="https://..." />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="is_pinned" defaultChecked={post?.is_pinned ?? false} className="h-4 w-4" />
              📌 상단 고정
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="is_published" defaultChecked={post?.is_published ?? false} className="h-4 w-4" />
              ✅ 공개 발행 (체크 해제 시 임시저장)
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
