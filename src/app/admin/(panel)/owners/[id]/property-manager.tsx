"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, DoorOpen, Plus, Layers, Trash2, Loader2, FileSignature, Pencil, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MODE_OPTIONS, TYPE_OPTIONS, modeLabel } from "../constants";
import type { OwnerBuilding, OwnerUnit } from "./types";
import { createBuilding, addUnit, addUnitsBulk, deleteProperty, createLeaseForUnit, updateBuilding, updateUnit } from "./property-actions";

function ModeBadges({ modes }: { modes: string[] }) {
  if (!modes.length) return <span className="text-xs text-muted-foreground">유형 미지정</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {modes.map((m) => {
        const ml = modeLabel(m);
        return <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ml.color}`}>{ml.label}</span>;
      })}
    </span>
  );
}

function ModeChecks({ selected }: { selected?: string[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {MODE_OPTIONS.map((m) => (
        <label key={m.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="checkbox" name="service_modes" value={m.key} defaultChecked={selected?.includes(m.key)} className="h-4 w-4" />
          {m.label}
        </label>
      ))}
    </div>
  );
}

export function PropertyManager({
  ownerId, buildings, standaloneUnits, tenants,
}: {
  ownerId: string;
  buildings: OwnerBuilding[];
  standaloneUnits: OwnerUnit[];
  tenants: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<
    | { kind: "building" }
    | { kind: "unit"; buildingId: string | null; buildingName?: string }
    | { kind: "bulk"; buildingId: string; buildingName: string }
    | { kind: "lease"; unitId: string; unitLabel: string }
    | { kind: "editBuilding"; b: OwnerBuilding }
    | { kind: "editUnit"; u: OwnerUnit }
    | null
  >(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string; count?: number }>, okMsg: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.count ? `${r.count}개 ${okMsg}` : okMsg);
        setDialog(null);
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  function onDelete(id: string, label: string, isBuilding: boolean) {
    if (!confirm(`${label}을(를) 삭제할까요?${isBuilding ? "\n(하위 호실의 건물 연결만 해제됩니다)" : ""}`)) return;
    run(() => deleteProperty(ownerId, id), "삭제되었습니다");
  }

  const totalUnits = buildings.reduce((s, b) => s + b.units.length, 0) + standaloneUnits.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium">건물 {buildings.length} · 호실 {totalUnits}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setDialog({ kind: "unit", buildingId: null })}>
            <Plus className="h-3.5 w-3.5" /> 단독 호실
          </Button>
          <Button size="sm" className="gap-1" onClick={() => setDialog({ kind: "building" })}>
            <Plus className="h-4 w-4" /> 건물 등록
          </Button>
        </div>
      </div>

      {buildings.length === 0 && standaloneUnits.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          등록된 물건이 없습니다. &quot;건물 등록&quot; 또는 &quot;단독 호실&quot;로 시작하세요.
        </p>
      ) : (
        <div className="space-y-3">
          {buildings.map((b) => (
            <div key={b.id} className="rounded-lg border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm">{b.name}</span>
                {b.address && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{b.address}</span>}
                <span className="ml-1"><ModeBadges modes={b.modes} /></span>
                <div className="ml-auto flex items-center gap-1">
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1" title="시설관리 업체 (인터넷·청소·전기 등)">
                    <Link href={`/admin/buildings-managed/${b.id}`}>
                      <Wrench className="h-3.5 w-3.5" /> 시설{b.vendor_count > 0 ? ` ${b.vendor_count}` : ""}
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setDialog({ kind: "editBuilding", b })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => setDialog({ kind: "unit", buildingId: b.id, buildingName: b.name })}>
                    <Plus className="h-3.5 w-3.5" /> 호실
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => setDialog({ kind: "bulk", buildingId: b.id, buildingName: b.name })}>
                    <Layers className="h-3.5 w-3.5" /> 일괄
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => onDelete(b.id, b.name, true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {b.units.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-3">등록된 호실 없음 — 우측 &quot;호실&quot;/&quot;일괄&quot;로 추가</p>
              ) : (
                <ul className="divide-y">
                  {b.units.map((u) => <UnitRow key={u.id} u={u} onDelete={() => onDelete(u.id, u.label, false)} onLease={() => setDialog({ kind: "lease", unitId: u.id, unitLabel: `${b.name} ${u.label}` })} onEdit={() => setDialog({ kind: "editUnit", u })} />)}
                </ul>
              )}
            </div>
          ))}

          {standaloneUnits.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 text-sm font-semibold flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-muted-foreground" /> 단독 호실 (상위 건물 없음)
              </div>
              <ul className="divide-y">
                {standaloneUnits.map((u) => <UnitRow key={u.id} u={u} onDelete={() => onDelete(u.id, u.label, false)} onLease={() => setDialog({ kind: "lease", unitId: u.id, unitLabel: u.label })} onEdit={() => setDialog({ kind: "editUnit", u })} />)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 건물 등록 ── */}
      <Dialog open={dialog?.kind === "building"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>건물 등록</DialogTitle>
            <DialogDescription>관리유형·기본 보증금/월세는 호실에 자동 상속됩니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => createBuilding(ownerId, fd), "건물이 등록되었습니다"); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">건물명 *</Label><Input name="name" required placeholder="신림더로프트" /></div>
              <div>
                <Label className="mb-1 block text-xs">건물 유형</Label>
                <select name="type" defaultValue="villa" className="w-full h-9 px-3 text-sm rounded-md border bg-background">
                  {TYPE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div><Label className="mb-1 block text-xs">주소 *</Label><Input name="address" required placeholder="서울 관악구 …" /></div>
            <div><Label className="mb-1 block text-xs">관리유형 (복수 선택)</Label><ModeChecks /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="mb-1 block text-xs">기본 보증금</Label><Input name="deposit_default" type="number" min={0} defaultValue={0} /></div>
              <div><Label className="mb-1 block text-xs">기본 월세</Label><Input name="rent_default" type="number" min={0} defaultValue={0} /></div>
              <div><Label className="mb-1 block text-xs">기본 관리비</Label><Input name="management_fee_default" type="number" min={0} defaultValue={0} /></div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="gap-1">{pending && <Loader2 className="h-4 w-4 animate-spin" />}등록</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 호실 추가 (단건) ── */}
      <Dialog open={dialog?.kind === "unit"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>호실 추가{dialog?.kind === "unit" && dialog.buildingName ? ` — ${dialog.buildingName}` : " (단독)"}</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "unit" && dialog.buildingId
                ? "주소·유형·관리유형·기본값은 건물에서 상속됩니다. 호수만 입력하세요."
                : "단독 호실은 주소·유형·관리유형을 직접 입력합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const bid = dialog?.kind === "unit" ? dialog.buildingId : null; run(() => addUnit(ownerId, bid, fd), "호실이 추가되었습니다"); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">호수 *</Label><Input name="unit_no" required placeholder="201" /></div>
              <div><Label className="mb-1 block text-xs">층</Label><Input name="floor" type="number" /></div>
            </div>
            {dialog?.kind === "unit" && !dialog.buildingId && (
              <>
                <div><Label className="mb-1 block text-xs">주소 *</Label><Input name="address" required placeholder="서울 …" /></div>
                <div>
                  <Label className="mb-1 block text-xs">유형</Label>
                  <select name="type" defaultValue="villa" className="w-full h-9 px-3 text-sm rounded-md border bg-background">
                    {TYPE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div><Label className="mb-1 block text-xs">관리유형</Label><ModeChecks /></div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">보증금 (선택)</Label><Input name="deposit_default" type="number" min={0} placeholder="건물 기본값" /></div>
              <div><Label className="mb-1 block text-xs">월세 (선택)</Label><Input name="rent_default" type="number" min={0} placeholder="건물 기본값" /></div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="gap-1">{pending && <Loader2 className="h-4 w-4 animate-spin" />}추가</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 호실 일괄 생성 ── */}
      <Dialog open={dialog?.kind === "bulk"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>호실 일괄 생성{dialog?.kind === "bulk" ? ` — ${dialog.buildingName}` : ""}</DialogTitle>
            <DialogDescription>시작~끝 호수 범위로 한 번에 생성. 건물 정보 자동 상속. (예: 201~210 → 10개)</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const bid = dialog?.kind === "bulk" ? dialog.buildingId : ""; run(() => addUnitsBulk(ownerId, bid, fd), "호실이 생성되었습니다"); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">시작 호수 *</Label><Input name="start" type="number" required placeholder="201" /></div>
              <div><Label className="mb-1 block text-xs">끝 호수 *</Label><Input name="end" type="number" required placeholder="210" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="mb-1 block text-xs">접두</Label><Input name="prefix" placeholder="(예: B)" /></div>
              <div><Label className="mb-1 block text-xs">접미</Label><Input name="suffix" placeholder="(예: 호)" /></div>
              <div><Label className="mb-1 block text-xs">층(공통)</Label><Input name="floor" type="number" /></div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="gap-1">{pending && <Loader2 className="h-4 w-4 animate-spin" />}일괄 생성</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 공실 → 임차계약 생성 (수금 스케줄 자동) ── */}
      <Dialog open={dialog?.kind === "lease"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>임차계약 — {dialog?.kind === "lease" ? dialog.unitLabel : ""}</DialogTitle>
            <DialogDescription>계약 저장 시 월 수금 스케줄이 자동 생성됩니다. (수수료는 정산 탭에서 설정)</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const uid = dialog?.kind === "lease" ? dialog.unitId : ""; run(() => createLeaseForUnit(ownerId, uid, fd), "계약·수금 스케줄이 생성되었습니다"); }} className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs">임차인 (기존 선택)</Label>
              <select name="tenant_id" className="w-full h-9 px-3 text-sm rounded-md border bg-background">
                <option value="">+ 신규 임차인 직접 입력</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">신규 임차인명</Label><Input name="tenant_name" placeholder="미선택 시 입력" /></div>
              <div><Label className="mb-1 block text-xs">신규 연락처</Label><Input name="tenant_phone" placeholder="010-…" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="mb-1 block text-xs">보증금 *</Label><Input name="deposit" type="number" min={0} required defaultValue={0} /></div>
              <div><Label className="mb-1 block text-xs">월세 *</Label><Input name="rent_amount" type="number" min={0} required defaultValue={0} /></div>
              <div><Label className="mb-1 block text-xs">관리비</Label><Input name="management_fee" type="number" min={0} defaultValue={0} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="mb-1 block text-xs">시작일 *</Label><Input name="start_date" type="date" required /></div>
              <div><Label className="mb-1 block text-xs">종료일 *</Label><Input name="end_date" type="date" required /></div>
              <div><Label className="mb-1 block text-xs">청구일</Label><Input name="rent_day" type="number" min={1} max={31} defaultValue={1} /></div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="gap-1">{pending && <Loader2 className="h-4 w-4 animate-spin" />}계약 생성 + 수금 스케줄</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 건물 수정 ── */}
      <Dialog open={dialog?.kind === "editBuilding"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>건물 수정</DialogTitle>
            <DialogDescription>변경 사항은 기존 호실에 자동 적용되지 않습니다(신규 호실에만 상속).</DialogDescription>
          </DialogHeader>
          {dialog?.kind === "editBuilding" && (
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => updateBuilding(ownerId, dialog.b.id, fd), "건물이 수정되었습니다"); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1 block text-xs">건물명 *</Label><Input name="name" required defaultValue={dialog.b.name} /></div>
                <div>
                  <Label className="mb-1 block text-xs">건물 유형</Label>
                  <select name="type" defaultValue={dialog.b.type} className="w-full h-9 px-3 text-sm rounded-md border bg-background">
                    {TYPE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="mb-1 block text-xs">주소 *</Label><Input name="address" required defaultValue={dialog.b.address ?? ""} /></div>
              <div><Label className="mb-1 block text-xs">관리유형</Label><ModeChecks selected={dialog.b.modes} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="mb-1 block text-xs">기본 보증금</Label><Input name="deposit_default" type="number" min={0} defaultValue={dialog.b.deposit_default ?? 0} /></div>
                <div><Label className="mb-1 block text-xs">기본 월세</Label><Input name="rent_default" type="number" min={0} defaultValue={dialog.b.rent_default ?? 0} /></div>
                <div><Label className="mb-1 block text-xs">기본 관리비</Label><Input name="management_fee_default" type="number" min={0} defaultValue={dialog.b.management_fee_default ?? 0} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending} className="gap-1">{pending && <Loader2 className="h-4 w-4 animate-spin" />}저장</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 호실 수정 ── */}
      <Dialog open={dialog?.kind === "editUnit"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>호실 수정</DialogTitle>
            <DialogDescription>관리유형은 체크한 항목으로 덮어씁니다(미체크 시 기존 유지).</DialogDescription>
          </DialogHeader>
          {dialog?.kind === "editUnit" && (
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => updateUnit(ownerId, dialog.u.id, fd), "호실이 수정되었습니다"); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1 block text-xs">호수 *</Label><Input name="unit_no" required defaultValue={dialog.u.unit_no ?? dialog.u.label} /></div>
                <div><Label className="mb-1 block text-xs">층</Label><Input name="floor" type="number" defaultValue={dialog.u.floor ?? ""} /></div>
              </div>
              <div><Label className="mb-1 block text-xs">관리유형</Label><ModeChecks selected={dialog.u.modes} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1 block text-xs">보증금</Label><Input name="deposit_default" type="number" min={0} defaultValue={dialog.u.deposit_default ?? 0} /></div>
                <div><Label className="mb-1 block text-xs">월세</Label><Input name="rent_default" type="number" min={0} defaultValue={dialog.u.rent_default ?? 0} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending} className="gap-1">{pending && <Loader2 className="h-4 w-4 animate-spin" />}저장</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UnitRow({ u, onDelete, onLease, onEdit }: { u: OwnerUnit; onDelete: () => void; onLease: () => void; onEdit: () => void }) {
  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      <DoorOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="font-medium">{u.label}</span>
      {u.floor != null && <span className="text-xs text-muted-foreground">{u.floor}층</span>}
      <span className="ml-1"><ModeBadges modes={u.modes} /></span>
      <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${u.occupied ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
        {u.occupied ? "임차중" : "공실"}
      </span>
      {!u.occupied && (
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-blue-600" onClick={onLease}>
          <FileSignature className="h-3.5 w-3.5" /> 계약
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
      <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
    </li>
  );
}
