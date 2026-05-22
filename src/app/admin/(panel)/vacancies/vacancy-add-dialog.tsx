"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { createVacancy } from "./actions";

interface Props {
  properties: { id: string; name: string }[];
}

export function VacancyAddDialog({ properties }: Props) {
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("property_id", propertyId);

    // 평 입력 시 m² 자동 변환
    const pyeong = Number(fd.get("area_pyeong"));
    if (pyeong && !fd.get("area_m2")) {
      fd.set("area_m2", String((pyeong * 3.3058).toFixed(2)));
    }

    startTransition(async () => {
      const r = await createVacancy(fd);
      if (r.ok) {
        toast.success("매물이 등록되었습니다.");
        setOpen(false);
        setPropertyId("");
        form.reset();
      } else {
        toast.error("등록 실패", { description: r.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" /> 신규 매물 등록
      </Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>신규 매물 등록</DialogTitle>
          <DialogDescription>
            평형 입력 시 m² 는 자동 계산됩니다. 금액은 원 단위로 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>건물 *</Label>
              <Select value={propertyId} onValueChange={(v) => setPropertyId(v ?? "")}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>호수 *</Label>
              <Input name="unit_number" required className="mt-1.5" placeholder="예) 502" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>층</Label>
              <Input type="number" name="floor" className="mt-1.5" />
            </div>
            <div>
              <Label>평형 (자동 m² 변환)</Label>
              <Input type="number" step="0.01" name="area_pyeong" className="mt-1.5" placeholder="예) 25" />
            </div>
            <div>
              <Label>m² (직접 입력 시)</Label>
              <Input type="number" step="0.01" name="area_m2" className="mt-1.5" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>방 수</Label>
              <Input type="number" name="room_count" className="mt-1.5" placeholder="예) 2" />
            </div>
            <div>
              <Label>욕실 수</Label>
              <Input type="number" name="bathroom_count" className="mt-1.5" placeholder="예) 1" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>보증금 (원)</Label>
              <Input type="number" name="deposit" defaultValue="0" className="mt-1.5" />
            </div>
            <div>
              <Label>월세 (원)</Label>
              <Input type="number" name="monthly_rent" defaultValue="0" className="mt-1.5" />
            </div>
            <div>
              <Label>관리비 (원)</Label>
              <Input type="number" name="maintenance_fee" defaultValue="0" className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>입주 가능일</Label>
            <Input type="date" name="move_in_date" className="mt-1.5" />
          </div>

          <div>
            <Label>설명</Label>
            <Textarea name="description" rows={3} className="mt-1.5" placeholder="매물 특징, 옵션 등을 자유롭게 작성" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_published" name="is_published" defaultChecked className="h-4 w-4" />
            <Label htmlFor="is_published" className="text-sm cursor-pointer">즉시 공개</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" disabled={pending || !propertyId}>
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              등록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
