"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertDmUnit, deleteDmUnit } from "../actions";
import { toast } from "sonner";

interface Initial {
  property_id?: string;
  landlord_business_id?: string | null;
  alias?: string | null;
  profit_share_ratio?: string | null;
  deposit_amount?: number;
  contract_type?: string;
  monthly_target_revenue?: number | null;
  payment_method?: string | null;
  status?: string;
  notes?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

const RATIOS = ["5:5", "6:4", "7:3", "8:2", "9:1", "6:2:2", "7:2:1", "custom"];
const CONTRACT_TYPES = [
  { key: "weekly",    label: "주간" },
  { key: "monthly",   label: "월간" },
  { key: "quarterly", label: "분기" },
  { key: "custom",    label: "커스텀" },
];
const PAYMENT_METHODS = [
  { key: "monthly_cash",     label: "매월/현금" },
  { key: "monthly_transfer", label: "매월/이체" },
  { key: "deposit_included", label: "보증금포함" },
  { key: "custom",           label: "커스텀" },
];
const STATUSES = [
  { key: "active",      label: "운영중" },
  { key: "vacant",      label: "공실" },
  { key: "maintenance", label: "정비중" },
  { key: "terminated",  label: "종료" },
];

export function DmUnitForm({
  id,
  initial,
  properties,
  landlords,
}: {
  id?: string;
  initial?: Initial;
  properties: { id: string; name: string; short_alias: string | null }[];
  landlords: { id: string; name: string; business_name: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertDmUnit(id ?? null, fd);
      if (res.ok) {
        toast.success(id ? "수정 완료" : "등록 완료");
        router.push("/admin/dm");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function onDelete() {
    if (!id) return;
    if (!confirm("이 JNP 호실을 삭제하시겠습니까?\n연결된 정산 데이터도 함께 삭제됩니다.")) return;
    startTransition(async () => {
      const res = await deleteDmUnit(id);
      if (res.ok) {
        toast.success("삭제 완료");
        router.push("/admin/dm");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="property_id">건물 *</Label>
          <select
            id="property_id"
            name="property_id"
            required
            defaultValue={initial?.property_id ?? ""}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">선택...</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.short_alias ?? p.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="landlord_business_id">임사자 (임대인)</Label>
          <select
            id="landlord_business_id"
            name="landlord_business_id"
            defaultValue={initial?.landlord_business_id ?? ""}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">선택 안함</option>
            {landlords.map(l => (
              <option key={l.id} value={l.id}>
                {l.name}{l.business_name ? ` (${l.business_name})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="alias">호실 별칭</Label>
          <Input id="alias" name="alias" defaultValue={initial?.alias ?? ""} placeholder="신림 5층 1호, 101호 등" />
        </div>
        <div>
          <Label htmlFor="profit_share_ratio">수익 분배 비율</Label>
          <select
            id="profit_share_ratio"
            name="profit_share_ratio"
            defaultValue={initial?.profit_share_ratio ?? ""}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">선택 안함</option>
            {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="monthly_target_revenue">목표 월수익 (원)</Label>
          <Input id="monthly_target_revenue" name="monthly_target_revenue" type="number" inputMode="numeric" defaultValue={initial?.monthly_target_revenue ?? ""} placeholder="1200000" />
        </div>
        <div>
          <Label htmlFor="contract_type">계약 형태</Label>
          <select
            id="contract_type"
            name="contract_type"
            defaultValue={initial?.contract_type ?? "monthly"}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {CONTRACT_TYPES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="payment_method">지급 방법</Label>
          <select
            id="payment_method"
            name="payment_method"
            defaultValue={initial?.payment_method ?? ""}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">선택 안함</option>
            {PAYMENT_METHODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="deposit_amount">보증금 (원)</Label>
          <Input id="deposit_amount" name="deposit_amount" type="number" inputMode="numeric" defaultValue={initial?.deposit_amount ?? 0} />
        </div>
        <div>
          <Label htmlFor="status">상태</Label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "active"}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="started_at">시작일</Label>
          <Input id="started_at" name="started_at" type="date" defaultValue={initial?.started_at?.slice(0, 10) ?? ""} />
        </div>
        <div>
          <Label htmlFor="ended_at">종료일</Label>
          <Input id="ended_at" name="ended_at" type="date" defaultValue={initial?.ended_at?.slice(0, 10) ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={2} placeholder="이재영 - 매월 5일 지급, 7:3 (임대인:회사)" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-border/60 mt-4">
        <Button type="submit" disabled={pending}>{pending ? "처리 중..." : (id ? "수정 저장" : "등록")}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>취소</Button>
        {id && (
          <Button type="button" variant="destructive" onClick={onDelete} disabled={pending} className="ml-auto">
            삭제
          </Button>
        )}
      </div>
    </form>
  );
}
