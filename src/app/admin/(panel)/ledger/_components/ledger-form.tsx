"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertLedgerItem, deleteLedgerItem } from "../actions";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "management_fee", label: "💰 관리비 수입" },
  { key: "vendor_payment", label: "🏭 업체 지급" },
  { key: "revenue_other",  label: "🔹 기타 수입" },
  { key: "expense_other",  label: "🔻 기타 지출" },
  { key: "maintenance",    label: "🛠 수선·유지" },
  { key: "salary",         label: "👤 급여" },
  { key: "office_rent",    label: "🏢 사무실 임대료" },
  { key: "tax",            label: "🏛 세금" },
];

const STATUSES = [
  { key: "paid",    label: "✅ 지급 완료" },
  { key: "pending", label: "⏳ 대기" },
  { key: "planned", label: "📅 계획" },
  { key: "overdue", label: "🚨 연체" },
];

interface Initial {
  property_id?: string | null;
  period_year?: number;
  period_month?: number;
  category?: string;
  subcategory?: string | null;
  revenue?: number;
  expense?: number;
  description?: string | null;
  paid_at?: string | null;
  payment_status?: string;
  notes?: string | null;
}

export function LedgerForm({
  id,
  initial,
  properties,
}: {
  id?: string;
  initial?: Initial;
  properties: { id: string; name: string; short_alias: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const now = new Date();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertLedgerItem(id ?? null, fd);
      if (res.ok) {
        toast.success(id ? "수정 완료" : "등록 완료");
        router.push("/admin/ledger");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function onDelete() {
    if (!id) return;
    if (!confirm("이 손익 항목을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const res = await deleteLedgerItem(id);
      if (res.ok) {
        toast.success("삭제 완료");
        router.push("/admin/ledger");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <Label htmlFor="period_year">연 *</Label>
          <Input id="period_year" name="period_year" type="number" required defaultValue={initial?.period_year ?? now.getFullYear()} min={2020} max={2100} />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="period_month">월 *</Label>
          <Input id="period_month" name="period_month" type="number" required defaultValue={initial?.period_month ?? (now.getMonth() + 1)} min={1} max={12} />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="property_id">건물 (선택)</Label>
          <select
            id="property_id"
            name="property_id"
            defaultValue={initial?.property_id ?? ""}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">전체/미지정</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.short_alias ?? p.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="category">카테고리 *</Label>
          <select
            id="category"
            name="category"
            required
            defaultValue={initial?.category ?? ""}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">선택...</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="subcategory">서브 카테고리</Label>
          <Input id="subcategory" name="subcategory" defaultValue={initial?.subcategory ?? ""} placeholder="인터넷, 청소 등" />
        </div>
        <div>
          <Label htmlFor="revenue">수입 (원)</Label>
          <Input id="revenue" name="revenue" type="number" inputMode="numeric" defaultValue={initial?.revenue ?? 0} placeholder="0" />
        </div>
        <div>
          <Label htmlFor="expense">지출 (원)</Label>
          <Input id="expense" name="expense" type="number" inputMode="numeric" defaultValue={initial?.expense ?? 0} placeholder="0" />
        </div>
        <div>
          <Label htmlFor="payment_status">상태</Label>
          <select
            id="payment_status"
            name="payment_status"
            defaultValue={initial?.payment_status ?? "paid"}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="paid_at">지급일</Label>
          <Input id="paid_at" name="paid_at" type="date" defaultValue={initial?.paid_at?.slice(0, 10) ?? ""} />
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor="description">내용</Label>
          <Input id="description" name="description" defaultValue={initial?.description ?? ""} maxLength={500} placeholder="SK브로드밴드 인터넷, 한전 4월분 등" />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={2} />
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
