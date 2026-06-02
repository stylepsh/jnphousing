"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertLandlordBusiness, deleteLandlordBusiness } from "../actions";
import { toast } from "sonner";

interface Initial {
  name?: string;
  business_name?: string | null;
  business_number?: string | null;
  corporate_number?: string | null;
  representative?: string | null;
  phone?: string | null;
  email?: string | null;
  account_bank?: string | null;
  account_holder?: string | null;
  memo?: string | null;
  is_active?: boolean;
}

export function LandlordBusinessForm({ id, initial }: { id?: string; initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertLandlordBusiness(id ?? null, fd);
      if (res.ok) {
        toast.success(id ? "수정 완료" : "등록 완료");
        router.push("/admin/landlord-business");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function onDelete() {
    if (!id) return;
    if (!confirm("정말 삭제하시겠습니까?\n연결된 건물·JNP 호실에서 임사자 정보가 해제됩니다.")) return;
    startTransition(async () => {
      const res = await deleteLandlordBusiness(id);
      if (res.ok) {
        toast.success("삭제 완료");
        router.push("/admin/landlord-business");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">이름 *</Label>
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} required maxLength={100} placeholder="이장미" />
        </div>
        <div>
          <Label htmlFor="business_name">사업자명</Label>
          <Input id="business_name" name="business_name" defaultValue={initial?.business_name ?? ""} maxLength={200} placeholder="(주)트라움하임" />
        </div>
        <div>
          <Label htmlFor="business_number">사업자등록번호</Label>
          <Input id="business_number" name="business_number" defaultValue={initial?.business_number ?? ""} placeholder="123-45-67890" />
        </div>
        <div>
          <Label htmlFor="corporate_number">고유번호증</Label>
          <Input id="corporate_number" name="corporate_number" defaultValue={initial?.corporate_number ?? ""} placeholder="606-80-21237" />
        </div>
        <div>
          <Label htmlFor="representative">대표자명</Label>
          <Input id="representative" name="representative" defaultValue={initial?.representative ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">연락처</Label>
          <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} type="tel" placeholder="010-1234-5678" />
        </div>
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" defaultValue={initial?.email ?? ""} type="email" />
        </div>
        <div>
          <Label htmlFor="account_bank">계좌 은행</Label>
          <Input id="account_bank" name="account_bank" defaultValue={initial?.account_bank ?? ""} placeholder="KB국민은행" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="account_holder">예금주명</Label>
          <Input id="account_holder" name="account_holder" defaultValue={initial?.account_holder ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="memo">메모 (분배 비율·특이사항)</Label>
        <Textarea id="memo" name="memo" defaultValue={initial?.memo ?? ""} rows={3} placeholder="JNP 단기임대 5:5, 매월 5일 지급 등" />
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
