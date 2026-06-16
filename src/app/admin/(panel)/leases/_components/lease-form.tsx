"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { upsertLease } from "../actions";
import type { Lease } from "@/types/lease";

interface Option { id: string; name: string }
interface UnitOption { id: string; unit_no: string; owner_id: string | null; properties: { name: string } | null }

interface Props {
  mode: "create" | "edit";
  lease?: Lease;
  options: {
    landlords: Option[];
    tenants: Option[];
    units: UnitOption[];
  };
}

// 폼 전체 입력칸 크기 통일 — 시원시원하게 (h-11 / text-base)
const inputCls = "mt-1.5 h-11 text-base";
const triggerCls = "mt-1.5 h-11 w-full text-base";

export function LeaseForm({ mode, lease, options }: Props) {
  const router = useRouter();
  const [leaseType, setLeaseType] = useState<"long_term" | "short_term">(lease?.lease_type ?? "long_term");
  const [rentCycle, setRentCycle] = useState<"monthly" | "weekly" | "daily">(lease?.rent_cycle ?? "monthly");
  const [feeType, setFeeType] = useState<"percent" | "fixed">(lease?.fee_type ?? "percent");
  const [sourceType, setSourceType] = useState<"direct" | "broker" | "referral" | "other">(lease?.contract_source_type ?? "direct");
  const [landlordId, setLandlordId] = useState(lease?.landlord_id ?? "");
  const [unitId, setUnitId] = useState(lease?.unit_id ?? "");
  const [tenantId, setTenantId] = useState(lease?.tenant_id ?? "");
  const [pending, startTransition] = useTransition();

  // 임대인 우선 선택 → 해당 임대인 보유 호실만 노출
  const filteredUnits = useMemo(() => {
    if (!landlordId) return options.units;
    return options.units.filter((u) => u.owner_id === landlordId);
  }, [landlordId, options.units]);

  function onLandlordChange(v: string) {
    setLandlordId(v);
    // 선택한 임대인 소유가 아니면 호실 초기화
    if (unitId && !options.units.some((u) => u.id === unitId && u.owner_id === v)) {
      setUnitId("");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("lease_type", leaseType);
    fd.set("rent_cycle", rentCycle);
    fd.set("fee_type", feeType);
    fd.set("contract_source_type", sourceType);
    fd.set("unit_id", unitId);
    fd.set("landlord_id", landlordId);
    fd.set("tenant_id", tenantId);

    startTransition(async () => {
      const r = await upsertLease(lease?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "초안 저장되었습니다." : "수정되었습니다.");
        router.push(`/admin/leases/${r.id}`);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label>계약 유형 *</Label>
          <Select value={leaseType} onValueChange={(v) => v && setLeaseType(v as "long_term" | "short_term")}>
            <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="long_term">장기임대</SelectItem>
              <SelectItem value="short_term">단기임대</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>임대인 *</Label>
          <Select value={landlordId} onValueChange={(v) => v && onLandlordChange(v)}>
            <SelectTrigger className={triggerCls}><SelectValue placeholder="먼저 선택" /></SelectTrigger>
            <SelectContent>
              {options.landlords.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>호실 *</Label>
          <Select value={unitId} onValueChange={(v) => v && setUnitId(v)}>
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder={landlordId ? "보유 호실 선택" : "임대인 먼저 선택"} />
            </SelectTrigger>
            <SelectContent>
              {filteredUnits.length === 0 ? (
                <SelectItem value="__none" disabled>등록된 호실이 없습니다</SelectItem>
              ) : (
                filteredUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.properties?.name} · {u.unit_no}호</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>임차인 *</Label>
        <Select value={tenantId} onValueChange={(v) => v && setTenantId(v)}>
          <SelectTrigger className={triggerCls}><SelectValue placeholder="선택" /></SelectTrigger>
          <SelectContent>
            {options.tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label>계약일 *</Label>
          <Input type="date" name="start_date" required defaultValue={lease?.start_date ?? ""} className={inputCls} />
        </div>
        <div>
          <Label>입주일 (계약일과 다를 수 있음)</Label>
          <Input type="date" name="move_in_date" defaultValue={lease?.move_in_date ?? ""} className={inputCls} />
        </div>
        <div>
          <Label>계약 종료일 *</Label>
          <Input type="date" name="end_date" required defaultValue={lease?.end_date ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label>보증금 (원)</Label>
          <Input type="number" name="deposit" defaultValue={lease?.deposit ?? 0} className={inputCls} />
        </div>
        <div>
          <Label>월세 (원)</Label>
          <Input type="number" name="rent_amount" defaultValue={lease?.rent_amount ?? 0} className={inputCls} />
        </div>
        <div>
          <Label>관리비 (원)</Label>
          <Input type="number" name="management_fee" defaultValue={lease?.management_fee ?? 0} className={inputCls} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>청구 주기 *</Label>
          <Select value={rentCycle} onValueChange={(v) => v && setRentCycle(v as "monthly" | "weekly" | "daily")}>
            <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">매월</SelectItem>
              <SelectItem value="weekly">매주</SelectItem>
              <SelectItem value="daily">매일</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>청구일 (매월 며칠, 1~31)</Label>
          <Input
            type="number"
            name="rent_day"
            min={1}
            max={31}
            disabled={rentCycle !== "monthly"}
            defaultValue={lease?.rent_day ?? (rentCycle === "monthly" ? 25 : "")}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input type="checkbox" id="vat_included" name="vat_included" defaultChecked={lease?.vat_included ?? false} className="h-4 w-4" />
        <Label htmlFor="vat_included" className="text-sm cursor-pointer">부가세 별도 청구 (월세·관리비의 10%)</Label>
      </div>

      <hr />

      {/* ── 수익 분배 (임대인 ↔ JNP 위탁수수료) ── */}
      <div>
        <p className="text-sm font-bold text-muted-foreground mb-2">수익 분배 (임대인 ↔ JNP)</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>위탁수수료 방식 *</Label>
            <Select value={feeType} onValueChange={(v) => v && setFeeType(v as "percent" | "fixed")}>
              <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">비율 (월세의 %)</SelectItem>
                <SelectItem value="fixed">정액 (원)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>비율 (%)</Label>
            <Input
              type="number"
              step="0.01"
              name="fee_percent"
              min={0}
              max={100}
              disabled={feeType !== "percent"}
              defaultValue={lease?.fee_percent ?? (feeType === "percent" ? 10 : "")}
              className={inputCls}
            />
          </div>
          <div>
            <Label>정액 (원)</Label>
            <Input
              type="number"
              name="fee_fixed"
              min={0}
              disabled={feeType !== "fixed"}
              defaultValue={lease?.fee_fixed ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div>
        <Label>연체 연이율 (%)</Label>
        <Input type="number" step="0.01" name="overdue_annual_rate" defaultValue={lease?.overdue_annual_rate ?? 12} className={`${inputCls} max-w-xs`} />
      </div>

      <div>
        <Label>특약사항</Label>
        <Textarea name="special_terms" rows={3} defaultValue={lease?.special_terms ?? ""} className="mt-1.5 text-base" />
      </div>

      <hr />

      {/* ── 계약 경로 / 계약처 (어디서 계약했는지) ── */}
      <div>
        <p className="text-sm font-bold text-muted-foreground mb-2">계약 경로 / 계약처</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>계약 경로 *</Label>
            <Select value={sourceType} onValueChange={(v) => v && setSourceType(v as "direct" | "broker" | "referral" | "other")}>
              <SelectTrigger className={triggerCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">자체 계약 (직접)</SelectItem>
                <SelectItem value="broker">중개업소</SelectItem>
                <SelectItem value="referral">소개</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{sourceType === "broker" ? "중개업소명" : sourceType === "referral" ? "소개자명" : "계약처명"}</Label>
            <Input
              name="contract_source_name"
              defaultValue={lease?.contract_source_name ?? ""}
              placeholder={sourceType === "broker" ? "예: 한빛공인중개사" : sourceType === "referral" ? "예: 김OO 소개" : "선택"}
              className={inputCls}
            />
          </div>
          <div>
            <Label>계약처 연락처</Label>
            <Input name="contract_source_contact" defaultValue={lease?.contract_source_contact ?? ""} placeholder="예: 02-000-0000" className={inputCls} />
          </div>
        </div>
        <div className="mt-3">
          <Label>계약 경로 메모</Label>
          <Textarea name="contract_source_memo" rows={2} defaultValue={lease?.contract_source_memo ?? ""} placeholder="중개수수료·소개 경위 등 기록" className="mt-1.5 text-base" />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === "create" ? "초안 저장" : "수정"}
        </Button>
      </div>
    </form>
  );
}
