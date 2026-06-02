"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Layers, Loader2 } from "lucide-react";
import { bulkCreateUnits } from "./units-actions";

const PATTERNS = [
  { value: "{floor}{n:02}", label: "201, 202 ... (층+2자리)" },
  { value: "{floor}-{n}", label: "2-1, 2-2 ... (층-호)" },
  { value: "{floor}호{n}", label: "2호1, 2호2" },
  { value: "{floor}{n}", label: "21, 22 (압축)" },
];

function previewUnitNo(pattern: string, floor: number, n: number): string {
  return pattern
    .replace("{floor}", String(floor))
    .replace("{n:02}", String(n).padStart(2, "0"))
    .replace("{n}", String(n));
}

export function BulkUnitDialog({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [floorFrom, setFloorFrom] = useState(2);
  const [floorTo, setFloorTo] = useState(13);
  const [unitsPerFloor, setUnitsPerFloor] = useState(5);
  const [unitPattern, setUnitPattern] = useState(PATTERNS[0].value);
  const [startUnitNo, setStartUnitNo] = useState(1);
  const [pending, startTransition] = useTransition();

  const totalUnits = useMemo(() => {
    const floors = Math.max(0, floorTo - floorFrom + 1);
    return floors * Math.max(0, unitsPerFloor);
  }, [floorFrom, floorTo, unitsPerFloor]);

  const previews = useMemo(() => {
    const samples: string[] = [];
    if (floorTo >= floorFrom && unitsPerFloor > 0) {
      // 첫 층 처음 2개 + 끝 층 처음 2개
      for (let i = 0; i < Math.min(2, unitsPerFloor); i++) {
        samples.push(previewUnitNo(unitPattern, floorFrom, startUnitNo + i));
      }
      if (floorTo > floorFrom) {
        samples.push("...");
        for (let i = 0; i < Math.min(2, unitsPerFloor); i++) {
          samples.push(previewUnitNo(unitPattern, floorTo, startUnitNo + i));
        }
      }
    }
    return samples;
  }, [floorFrom, floorTo, unitsPerFloor, unitPattern, startUnitNo]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("property_id", propertyId);
    fd.set("floor_from", String(floorFrom));
    fd.set("floor_to", String(floorTo));
    fd.set("units_per_floor", String(unitsPerFloor));
    fd.set("unit_pattern", unitPattern);
    fd.set("start_unit_no", String(startUnitNo));
    if (totalUnits > 500) {
      toast.error(`최대 500호실까지 (현재 ${totalUnits})`);
      return;
    }
    if (!confirm(`총 ${totalUnits}개 호실을 일괄 등록하시겠습니까?`)) return;

    startTransition(async () => {
      const r = await bulkCreateUnits(fd);
      if (r.ok) {
        toast.success(`${r.inserted}개 호실 등록 완료${r.skipped > 0 ? ` (중복 ${r.skipped}개 스킵)` : ""}`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Layers className="h-4 w-4 mr-1.5" /> 호실 일괄 등록
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>호실 일괄 등록</DialogTitle>
            <DialogDescription>
              층 범위 × 호수를 한 번에 생성합니다. 예: 2층~13층 각 5호실 → 60개 호실 일괄 등록.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>시작 층</Label>
                <Input type="number" value={floorFrom} onChange={(e) => setFloorFrom(Number(e.target.value))} className="mt-1.5" />
              </div>
              <div>
                <Label>끝 층</Label>
                <Input type="number" value={floorTo} onChange={(e) => setFloorTo(Number(e.target.value))} className="mt-1.5" />
              </div>
              <div>
                <Label>각 층 호실 수</Label>
                <Input type="number" min={1} max={99} value={unitsPerFloor} onChange={(e) => setUnitsPerFloor(Number(e.target.value))} className="mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>호실 번호 패턴</Label>
                <Select value={unitPattern} onValueChange={(v) => v && setUnitPattern(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PATTERNS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>호실 번호 시작값</Label>
                <Input type="number" min={1} max={99} value={startUnitNo} onChange={(e) => setStartUnitNo(Number(e.target.value))} className="mt-1.5" />
              </div>
            </div>

            {/* 미리보기 */}
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
              <p className="text-xs text-muted-foreground mb-1">미리보기</p>
              <div className="flex flex-wrap gap-1.5 text-sm font-medium">
                {previews.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white border border-primary/20 text-primary text-xs">
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-xs mt-2 text-foreground/70">
                총 <strong className="text-primary">{totalUnits}개 호실</strong> 생성 예정
                {totalUnits > 500 && <span className="text-destructive"> · 500개 초과 (분할 등록 필요)</span>}
              </p>
            </div>

            <hr />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">공통 적용 (모든 호실에 동일하게)</p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>동 (선택)</Label>
                <Input name="dong" placeholder="예) A" className="mt-1.5" />
              </div>
              <div>
                <Label>평형</Label>
                <Input type="number" step="0.01" name="area_pyeong" className="mt-1.5" />
              </div>
              <div>
                <Label>방 수</Label>
                <Input type="number" name="room_count" className="mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>기본 보증금 (원)</Label>
                <Input type="number" name="deposit_default" defaultValue={0} className="mt-1.5" />
              </div>
              <div>
                <Label>기본 월세 (원)</Label>
                <Input type="number" name="rent_default" defaultValue={0} className="mt-1.5" />
              </div>
              <div>
                <Label>기본 관리비 (원)</Label>
                <Input type="number" name="management_fee_default" defaultValue={0} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label>관리 유형 (모든 호실에 동일 적용)</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {[
                  { k: "housing_mgmt", l: "🏢 주택관리" },
                  { k: "rental", l: "🤝 임대관리" },
                  { k: "dm", l: "🏠 JNP 단기임대" },
                ].map((m) => (
                  <label key={m.k} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" name="service_modes" value={m.k} className="h-4 w-4" />
                    {m.l}
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" disabled={pending || totalUnits === 0 || totalUnits > 500}>
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {totalUnits}개 일괄 등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
