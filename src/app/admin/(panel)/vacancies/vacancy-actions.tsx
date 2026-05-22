"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { updateVacancyStatus, deleteVacancy } from "./actions";

export function VacancyActions({
  vacancyId,
  currentStatus,
  variant,
}: {
  vacancyId: string;
  currentStatus: string;
  variant: "status-only" | "actions-only";
}) {
  const [pending, startTransition] = useTransition();

  function onStatusChange(v: string | null) {
    if (!v) return;
    startTransition(async () => {
      const r = await updateVacancyStatus(vacancyId, v as "available" | "reserved" | "contracted");
      if (r.ok) toast.success("상태가 변경되었습니다.");
      else toast.error("실패", { description: r.error });
    });
  }

  function onDelete() {
    if (!confirm("정말 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    startTransition(async () => {
      const r = await deleteVacancy(vacancyId);
      if (r.ok) toast.success("삭제되었습니다.");
      else toast.error("삭제 실패", { description: r.error });
    });
  }

  if (variant === "status-only") {
    return (
      <Select value={currentStatus} onValueChange={onStatusChange} disabled={pending}>
        <SelectTrigger className="h-8 text-xs w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="available">공실</SelectItem>
          <SelectItem value="reserved">예약</SelectItem>
          <SelectItem value="contracted">계약</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
      <Trash2 className="h-3.5 w-3.5 text-destructive" />
    </Button>
  );
}
