"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitInspection } from "../../pipeline/actions";
import { cn } from "@/lib/utils";

type Occupancy = "" | "vacant" | "occupied" | "recheck";
type MailStatus = "" | "none" | "normal" | "overflow";
type CanOpen = "" | "possible" | "impossible" | "admin_check";
type Merch = "" | "possible" | "hold" | "impossible";

function Pills<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={cn(
            "px-3.5 py-2 rounded-lg border text-sm font-medium transition",
            value === o.v ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function InspectionForm({
  inspectionId,
  propertyId,
  readonly,
  initial,
}: {
  inspectionId: string;
  propertyId: string;
  readonly: boolean;
  initial?: {
    occupancy?: Occupancy;
    mailStatus?: MailStatus;
    keyNeeded?: boolean;
    canOpen?: CanOpen;
    openMemo?: string;
    merchandisingReady?: Merch;
    comment?: string;
  };
}) {
  const router = useRouter();
  const [occupancy, setOccupancy] = useState<Occupancy>(initial?.occupancy ?? "");
  const [mailStatus, setMailStatus] = useState<MailStatus>(initial?.mailStatus ?? "");
  const [keyNeeded, setKeyNeeded] = useState<boolean>(initial?.keyNeeded ?? false);
  const [canOpen, setCanOpen] = useState<CanOpen>(initial?.canOpen ?? "");
  const [openMemo, setOpenMemo] = useState<string>(initial?.openMemo ?? "");
  const [merch, setMerch] = useState<Merch>(initial?.merchandisingReady ?? "");
  const [comment, setComment] = useState<string>(initial?.comment ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!occupancy || !mailStatus || !canOpen || !merch) {
      toast.error("점유/우편/개문/상품화 항목을 모두 선택하세요.");
      return;
    }
    if (!comment.trim()) {
      toast.error("현장 메모는 필수입니다.");
      return;
    }
    if (canOpen === "possible" && !openMemo.trim()) {
      toast.error("개문 가능 시 개문 방법 메모를 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await submitInspection({
        inspectionId,
        propertyId,
        occupancy,
        mailStatus,
        keyNeeded,
        canOpen,
        openMemo: openMemo.trim() || undefined,
        merchandisingReady: merch,
        comment: comment.trim(),
      });
      if (!res.ok) {
        toast.error(res.error ?? "제출 실패");
        return;
      }
      toast.success("답사 결과가 제출되었습니다.");
      router.push("/admin/auction/inspect");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-xl">
      {readonly && (
        <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          이미 제출된 답사입니다. (읽기 전용)
        </div>
      )}

      <section className="space-y-2">
        <Label>점유 상태 *</Label>
        <Pills
          value={occupancy}
          onChange={setOccupancy}
          disabled={readonly}
          options={[
            { v: "vacant", label: "공실" },
            { v: "occupied", label: "점유중" },
            { v: "recheck", label: "재확인" },
          ]}
        />
      </section>

      <section className="space-y-2">
        <Label>우편물 *</Label>
        <Pills
          value={mailStatus}
          onChange={setMailStatus}
          disabled={readonly}
          options={[
            { v: "none", label: "없음" },
            { v: "normal", label: "정상" },
            { v: "overflow", label: "다량 쌓임" },
          ]}
        />
      </section>

      <section className="space-y-2">
        <Label>개문 / 도어락 *</Label>
        <Pills
          value={canOpen}
          onChange={setCanOpen}
          disabled={readonly}
          options={[
            { v: "possible", label: "개문 가능" },
            { v: "impossible", label: "개문 불가" },
            { v: "admin_check", label: "관리자 확인" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm mt-1">
          <input type="checkbox" checked={keyNeeded} disabled={readonly} onChange={(e) => setKeyNeeded(e.target.checked)} />
          개문 작업 필요
        </label>
        {canOpen === "possible" && (
          <Textarea
            value={openMemo}
            disabled={readonly}
            onChange={(e) => setOpenMemo(e.target.value)}
            rows={2}
            placeholder="개문 방법 / 현관 비밀번호 등"
          />
        )}
      </section>

      <section className="space-y-2">
        <Label>즉시 상품화 가능성 *</Label>
        <Pills
          value={merch}
          onChange={setMerch}
          disabled={readonly}
          options={[
            { v: "possible", label: "가능" },
            { v: "hold", label: "보류" },
            { v: "impossible", label: "불가" },
          ]}
        />
      </section>

      <section className="space-y-2">
        <Label>현장 메모 *</Label>
        <Textarea
          value={comment}
          disabled={readonly}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="현장 상황을 자유롭게 기록하세요."
          className="min-h-[120px]"
        />
      </section>

      {!readonly && (
        <Button onClick={submit} disabled={pending} className="w-full">
          {pending ? "제출 중..." : "답사 결과 제출"}
        </Button>
      )}
    </div>
  );
}
