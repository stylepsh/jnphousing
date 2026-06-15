"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, Loader2, CalendarDays, Lock, MessageSquareReply } from "lucide-react";
import { updateComplaint } from "./actions";
import type { Complaint, ComplaintStatus } from "@/types/database";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS 요청",
  facility: "시설 고장",
  noise: "소음 민원",
  complaint: "기타 민원",
  etc: "기타",
};

const STATUS_OPTIONS: { v: ComplaintStatus; l: string; active: string }[] = [
  { v: "received", l: "접수", active: "bg-blue-600 text-white border-blue-600" },
  { v: "in_progress", l: "처리중", active: "bg-amber-500 text-white border-amber-500" },
  { v: "resolved", l: "완료", active: "bg-green-600 text-white border-green-600" },
  { v: "closed", l: "종결", active: "bg-slate-600 text-white border-slate-600" },
];

function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ComplaintRow({ complaint }: { complaint: Complaint }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [reply, setReply] = useState(complaint.admin_memo ?? "");
  const [internalMemo, setInternalMemo] = useState(complaint.internal_memo ?? "");
  const [visitDate, setVisitDate] = useState(complaint.visit_scheduled_at ?? "");
  const [assignee, setAssignee] = useState(complaint.assigned_to ?? "");
  const [pending, startTransition] = useTransition();

  /** 부분 저장 — 주어진 patch 만 서버에 반영. close=true 면 저장 후 닫기. */
  function persist(
    patch: Parameters<typeof updateComplaint>[1],
    okMsg: string,
    close = false,
  ) {
    startTransition(async () => {
      const r = await updateComplaint(complaint.id, patch);
      if (r.ok) {
        toast.success(okMsg);
        if (close) setOpen(false);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  /** 전체 저장 (회신·방문예정일·내부메모·담당자·상태) */
  function saveAll() {
    persist(
      {
        status,
        admin_memo: reply,
        internal_memo: internalMemo,
        assigned_to: assignee,
        visit_scheduled_at: visitDate,
      },
      "저장되었습니다.",
      true,
    );
  }

  /** 상태 원클릭 — 즉시 저장 (모달 열지 않아도 빠른 처리) */
  function quickStatus(s: ComplaintStatus) {
    setStatus(s);
    persist({ status: s }, `상태를 '${STATUS_OPTIONS.find((o) => o.v === s)?.l}'(으)로 변경`);
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

            {/* ── 처리 상태 (원클릭) ── */}
            <div>
              <Label className="text-sm">처리 상태 <span className="text-xs font-normal text-muted-foreground">— 누르면 바로 저장</span></Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    disabled={pending}
                    onClick={() => quickStatus(o.v)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm font-bold transition disabled:opacity-50",
                      status === o.v ? o.active : "bg-white text-foreground border-border hover:bg-muted",
                    )}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 방문 예정일 (입주민 공개) ── */}
            <div>
              <Label className="text-sm flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600" /> 방문 예정일
                <span className="text-xs font-normal text-blue-700">(입주민에게 표시)</span>
              </Label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="max-w-[200px]"
                />
                <button type="button" onClick={() => setVisitDate(toYmd(new Date()))} className="text-xs font-bold text-blue-700 hover:underline">오늘</button>
                <button type="button" onClick={() => setVisitDate(toYmd(new Date(Date.now() + 86400000)))} className="text-xs font-bold text-blue-700 hover:underline">내일</button>
                {visitDate && (
                  <button type="button" onClick={() => setVisitDate("")} className="text-xs text-muted-foreground hover:underline">지우기</button>
                )}
              </div>
            </div>

            {/* ── 입주민 회신/답변 (admin_memo, 공개) ── */}
            <div>
              <Label className="text-sm flex items-center gap-1.5">
                <MessageSquareReply className="h-3.5 w-3.5 text-green-600" /> 입주민 회신/답변
                <span className="text-xs font-normal text-green-700">(입주민 조회 시 표시)</span>
              </Label>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="예: 6/18(목) 오전 방문하여 누수 점검 예정입니다. 확인 후 다시 연락드리겠습니다."
                rows={3}
                className="mt-1.5"
              />
            </div>

            {/* ── 내부 메모 (internal_memo, 비공개) ── */}
            <div>
              <Label className="text-sm flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-rose-600" /> 내부 메모 (우리끼리)
                <span className="text-xs font-normal text-rose-700">입주민에게 안 보임</span>
              </Label>
              <Textarea
                value={internalMemo}
                onChange={(e) => setInternalMemo(e.target.value)}
                placeholder="부장님 지시·업체 견적·실제 원인 등 내부 공유용 기록."
                rows={3}
                className="mt-1.5 bg-rose-50/40 border-rose-200"
              />
            </div>

            {/* ── 담당자 ── */}
            <div>
              <Label className="text-sm">담당자 (선택)</Label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="예: 김부장"
                className="mt-1.5 max-w-[240px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={saveAll} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
