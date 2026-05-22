"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import { updateComplaint } from "./actions";
import type { Complaint } from "@/types/database";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS 요청",
  facility: "시설 고장",
  noise: "소음 민원",
  complaint: "기타 민원",
  etc: "기타",
};

export function ComplaintRow({ complaint }: { complaint: Complaint }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(complaint.status);
  const [memo, setMemo] = useState(complaint.admin_memo ?? "");
  const [assignee, setAssignee] = useState(complaint.assigned_to ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateComplaint(complaint.id, {
        status,
        admin_memo: memo,
        assigned_to: assignee,
      });
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
            <DialogTitle>{complaint.title}</DialogTitle>
            <DialogDescription>
              {complaint.building_name ?? "-"} · {complaint.unit_number}호 · {CATEGORY_LABEL[complaint.category]} · {format(new Date(complaint.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">입주자</p>
                <p className="font-medium">{complaint.tenant_name}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">연락처</p>
                <p className="font-medium">{complaint.tenant_phone}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">민원 내용</p>
              <div className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap">{complaint.content}</div>
            </div>

            {complaint.images && complaint.images.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">첨부 이미지 ({complaint.images.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {complaint.images.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                      <div className="aspect-square rounded-lg bg-muted overflow-hidden hover:opacity-80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <hr />

            <div>
              <Label className="text-sm">처리 상태</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as Complaint["status"])}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">접수</SelectItem>
                  <SelectItem value="in_progress">처리중</SelectItem>
                  <SelectItem value="resolved">완료</SelectItem>
                  <SelectItem value="closed">종결</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">담당자 (선택)</Label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="예: 김부장"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm">관리자 메모 (입주민 조회 시 표시됨)</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="처리 과정·결과·연락 내용 등을 기록하세요."
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
