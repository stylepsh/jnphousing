"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertBuildingVendor, deleteBuildingVendor } from "../actions";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "internet",  label: "📡 인터넷" },
  { key: "cleaning",  label: "🧹 청소" },
  { key: "electric",  label: "⚡ 전기" },
  { key: "water",     label: "💧 수도" },
  { key: "fire",      label: "🚒 소방" },
  { key: "elevator",  label: "🛗 승강기" },
  { key: "etc",       label: "📦 기타" },
];

interface Initial {
  category?: string;
  vendor_name?: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  customer_number?: string | null;
  account_bank?: string | null;
  account_holder?: string | null;
  monthly_fee?: number | null;
  billing_cycle?: string | null;
  customer_center_phone?: string | null;
  contract_url?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export function VendorForm({
  id,
  propertyId,
  initial,
  defaultCategory,
}: {
  id?: string;
  propertyId: string;
  initial?: Initial;
  defaultCategory?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("property_id", propertyId);
    startTransition(async () => {
      const res = await upsertBuildingVendor(id ?? null, fd);
      if (res.ok) {
        toast.success(id ? "수정 완료" : "등록 완료");
        router.push(`/admin/buildings-managed/${propertyId}`);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function onDelete() {
    if (!id) return;
    if (!confirm("이 시설관리 업체를 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const res = await deleteBuildingVendor(id, propertyId);
      if (res.ok) {
        toast.success("삭제 완료");
        router.push(`/admin/buildings-managed/${propertyId}`);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category">카테고리 *</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue={initial?.category ?? defaultCategory ?? ""}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">선택...</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="vendor_name">업체명 *</Label>
        <Input id="vendor_name" name="vendor_name" defaultValue={initial?.vendor_name ?? ""} required maxLength={200} placeholder="SK브로드밴드" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact_person">담당자명</Label>
          <Input id="contact_person" name="contact_person" defaultValue={initial?.contact_person ?? ""} placeholder="양휴창 과장" />
        </div>
        <div>
          <Label htmlFor="contact_phone">담당자 연락처</Label>
          <Input id="contact_phone" name="contact_phone" defaultValue={initial?.contact_phone ?? ""} type="tel" />
        </div>
        <div>
          <Label htmlFor="contact_email">담당자 이메일</Label>
          <Input id="contact_email" name="contact_email" defaultValue={initial?.contact_email ?? ""} type="email" />
        </div>
        <div>
          <Label htmlFor="customer_number">고객번호/납부번호</Label>
          <Input id="customer_number" name="customer_number" defaultValue={initial?.customer_number ?? ""} />
        </div>
        <div>
          <Label htmlFor="monthly_fee">월 비용 (원)</Label>
          <Input id="monthly_fee" name="monthly_fee" defaultValue={initial?.monthly_fee ?? ""} type="number" inputMode="numeric" placeholder="150000" />
        </div>
        <div>
          <Label htmlFor="billing_cycle">청구 주기</Label>
          <Input id="billing_cycle" name="billing_cycle" defaultValue={initial?.billing_cycle ?? ""} placeholder="매월/말일자동이체" />
        </div>
        <div>
          <Label htmlFor="account_bank">계좌 은행</Label>
          <Input id="account_bank" name="account_bank" defaultValue={initial?.account_bank ?? ""} />
        </div>
        <div>
          <Label htmlFor="account_holder">예금주명</Label>
          <Input id="account_holder" name="account_holder" defaultValue={initial?.account_holder ?? ""} />
        </div>
        <div>
          <Label htmlFor="customer_center_phone">고객센터 번호</Label>
          <Input id="customer_center_phone" name="customer_center_phone" defaultValue={initial?.customer_center_phone ?? ""} placeholder="106 / 1588-7500" />
        </div>
        <div>
          <Label htmlFor="contract_url">계약서 URL</Label>
          <Input id="contract_url" name="contract_url" defaultValue={initial?.contract_url ?? ""} type="url" placeholder="https://..." />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" name="is_active" defaultChecked={initial?.is_active ?? true} className="h-4 w-4" />
        <Label htmlFor="is_active" className="cursor-pointer">활성</Label>
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
