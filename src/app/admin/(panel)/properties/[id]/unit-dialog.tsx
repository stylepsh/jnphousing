"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import { upsertUnit, deleteUnit } from "./units-actions";
import type { PropertyUnit } from "@/types/lease";

interface Props {
  mode: "create" | "edit";
  propertyId: string;
  unit?: PropertyUnit;
}

export function UnitDialog({ mode, propertyId, unit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("property_id", propertyId);
    startTransition(async () => {
      const r = await upsertUnit(unit?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "호실이 등록되었습니다." : "수정되었습니다.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  function onDelete() {
    if (!unit?.id) return;
    if (!confirm(`${unit.unit_no} 호실을 삭제하시겠습니까?\n연결된 계약이 있으면 삭제 불가합니다.`)) return;
    startTransition(async () => {
      const r = await deleteUnit(unit.id);
      if (r.ok) {
        toast.success("삭제되었습니다.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> 호실 추가
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> 편집
        </Button>
      )}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "호실 등록" : `${unit?.unit_no} 호실 수정`}</DialogTitle>
          <DialogDescription>호실의 기본 임대 조건. 신규 계약 등록 시 기본값으로 사용됩니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>호실 *</Label>
              <Input name="unit_no" required defaultValue={unit?.unit_no ?? ""} placeholder="예) 502" className="mt-1.5" />
            </div>
            <div>
              <Label>동</Label>
              <Input name="dong" defaultValue={unit?.dong ?? ""} placeholder="예) A" className="mt-1.5" />
            </div>
            <div>
              <Label>층</Label>
              <Input type="number" name="floor" defaultValue={unit?.floor ?? ""} className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>평형 (m² 자동 계산)</Label>
              <Input type="number" step="0.01" name="area_pyeong" defaultValue={unit?.area_pyeong ?? ""} placeholder="예) 12.5" className="mt-1.5" />
            </div>
            <div>
              <Label>m² (직접 입력 시)</Label>
              <Input type="number" step="0.01" name="area_m2" defaultValue={unit?.area_m2 ?? ""} className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>방 수</Label>
              <Input type="number" name="room_count" defaultValue={unit?.room_count ?? ""} className="mt-1.5" />
            </div>
            <div>
              <Label>욕실 수</Label>
              <Input type="number" name="bathroom_count" defaultValue={unit?.bathroom_count ?? ""} className="mt-1.5" />
            </div>
          </div>

          <hr />

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">기본 임대 조건</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>보증금 (원)</Label>
              <Input type="number" name="deposit_default" defaultValue={unit?.deposit_default ?? 0} className="mt-1.5" />
            </div>
            <div>
              <Label>월세 (원)</Label>
              <Input type="number" name="rent_default" defaultValue={unit?.rent_default ?? 0} className="mt-1.5" />
            </div>
            <div>
              <Label>관리비 (원)</Label>
              <Input type="number" name="management_fee_default" defaultValue={unit?.management_fee_default ?? 0} className="mt-1.5" />
            </div>
          </div>

          <hr />

          <div>
            <Label>관리 유형 (복수 선택)</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {[
                { k: "housing_mgmt", l: "🏢 주택관리" },
                { k: "rental", l: "🤝 임대관리" },
                { k: "dm", l: "🏠 단기임대(DM)" },
              ].map((m) => (
                <label key={m.k} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="service_modes"
                    value={m.k}
                    defaultChecked={unit?.service_modes?.includes(m.k) ?? false}
                    className="h-4 w-4"
                  />
                  {m.l}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>메모</Label>
            <Textarea name="notes" rows={2} defaultValue={unit?.notes ?? ""} placeholder="특이사항, 옵션 등" className="mt-1.5" />
          </div>

          <DialogFooter className="flex !justify-between pt-2">
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
