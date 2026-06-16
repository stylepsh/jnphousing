"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertBuildingManaged } from "../actions";
import { toast } from "sonner";

interface Initial {
  name?: string;
  short_alias?: string | null;
  address?: string | null;
  business_name?: string | null;
  business_number?: string | null;
  corporate_number?: string | null;
  entrance_password?: string | null;
  management_account?: string | null;
  landlord_business_id?: string | null;
  service_modes?: string[] | null;
  total_units?: number;
}

const MODE_OPTIONS = [
  { key: "housing_mgmt",     label: "건물 위탁관리" },
  { key: "rental_consigned", label: "위탁임대관리" },
];

export function BuildingForm({
  id,
  initial,
  landlords,
}: {
  id?: string;
  initial?: Initial;
  landlords: { id: string; name: string; business_name: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertBuildingManaged(id ?? null, fd);
      if (res.ok) {
        toast.success(id ? "수정 완료" : "등록 완료");
        router.push(id ? `/admin/buildings-managed/${id}` : "/admin/buildings-managed");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const initialModes = initial?.service_modes ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="name" className="mb-1.5 block">건물명 *</Label>
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} required maxLength={200} placeholder="신림더로프트" className="h-11 text-base" />
        </div>
        <div>
          <Label htmlFor="short_alias" className="mb-1.5 block">짧은 별칭</Label>
          <Input id="short_alias" name="short_alias" defaultValue={initial?.short_alias ?? ""} maxLength={100} placeholder="신림더" className="h-11 text-base" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address" className="mb-1.5 block">주소</Label>
          <Input id="address" name="address" defaultValue={initial?.address ?? ""} maxLength={500} placeholder="관악구 시흥대로158가길 25" className="h-11 text-base" />
        </div>
        <div>
          <Label htmlFor="business_name" className="mb-1.5 block">사업자명</Label>
          <Input id="business_name" name="business_name" defaultValue={initial?.business_name ?? ""} placeholder="(주)트라움하임" className="h-11 text-base" />
        </div>
        <div>
          <Label htmlFor="business_number" className="mb-1.5 block">사업자등록번호</Label>
          <Input id="business_number" name="business_number" defaultValue={initial?.business_number ?? ""} placeholder="123-45-67890" className="h-11 text-base" />
        </div>
        <div>
          <Label htmlFor="corporate_number" className="mb-1.5 block">고유번호증</Label>
          <Input id="corporate_number" name="corporate_number" defaultValue={initial?.corporate_number ?? ""} placeholder="606-80-21237" className="h-11 text-base" />
        </div>
        <div>
          <Label htmlFor="total_units" className="mb-1.5 block">총 세대수</Label>
          <Input id="total_units" name="total_units" defaultValue={initial?.total_units ?? 0} type="number" min={0} className="h-11 text-base" />
        </div>
        <div>
          <Label htmlFor="entrance_password" className="mb-1.5 block">공동현관 비밀번호</Label>
          <Input id="entrance_password" name="entrance_password" defaultValue={initial?.entrance_password ?? ""} placeholder="*****" className="h-11 text-base" />
        </div>
        <div>
          <Label htmlFor="management_account" className="mb-1.5 block">관리단 계좌</Label>
          <Input id="management_account" name="management_account" defaultValue={initial?.management_account ?? ""} placeholder="KB 123-456-789012" className="h-11 text-base" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="landlord_business_id" className="mb-1.5 block">임사자 (임대사업자)</Label>
          <select
            id="landlord_business_id"
            name="landlord_business_id"
            defaultValue={initial?.landlord_business_id ?? ""}
            className="w-full h-11 px-3 rounded-lg border border-input bg-background text-base"
          >
            <option value="">선택 안함</option>
            {landlords.map(l => (
              <option key={l.id} value={l.id}>
                {l.name}{l.business_name ? ` (${l.business_name})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label>서비스 모드 (복수 선택)</Label>
        <div className="flex flex-wrap gap-3 mt-2">
          {MODE_OPTIONS.map(m => (
            <label key={m.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="service_modes"
                value={m.key}
                defaultChecked={initialModes.includes(m.key)}
                className="h-4 w-4"
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/60 mt-4">
        <Button type="submit" disabled={pending}>{pending ? "처리 중..." : (id ? "수정 저장" : "등록")}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>취소</Button>
      </div>
    </form>
  );
}
