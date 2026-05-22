"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import { updateInquiry } from "./actions";
import type { Inquiry } from "@/types/database";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export function InquiryRow({ inquiry }: { inquiry: Inquiry }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(inquiry.status);
  const [memo, setMemo] = useState(inquiry.admin_memo ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateInquiry(inquiry.id, { status, admin_memo: memo });
      if (r.ok) {
        toast.success("저장되었습니다.");
        setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5 mr-1" /> 상세
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>관리문의 상세</DialogTitle>
            <DialogDescription>
              {format(new Date(inquiry.created_at), "yyyy.MM.dd HH:mm", { locale: ko })} 접수
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">담당자</p>
                <p className="font-medium">{inquiry.contact_name}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">회사명</p>
                <p className="font-medium">{inquiry.company_name ?? "-"}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">연락처</p>
                <p className="font-medium">
                  <a href={`tel:${inquiry.phone}`} className="text-primary hover:underline">{inquiry.phone}</a>
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">이메일</p>
                <p className="font-medium">{inquiry.email ?? "-"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="col-span-3 sm:col-span-1 rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">건물 유형</p>
                <p className="font-medium">{inquiry.building_type ?? "-"}</p>
              </div>
              <div className="col-span-3 sm:col-span-1 rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">세대수</p>
                <p className="font-medium">{inquiry.total_units ?? "-"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">건물 주소</p>
              <div className="rounded-lg bg-muted/40 p-3 text-sm">{inquiry.building_address}</div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">문의 내용</p>
              <div className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap">{inquiry.message}</div>
            </div>

            <hr />

            <div>
              <Label className="text-sm">처리 상태</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as Inquiry["status"])}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">신규</SelectItem>
                  <SelectItem value="contacted">응대중</SelectItem>
                  <SelectItem value="closed">종결</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">관리자 메모</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="연락 결과, 후속 일정 등을 기록하세요."
                rows={4}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
