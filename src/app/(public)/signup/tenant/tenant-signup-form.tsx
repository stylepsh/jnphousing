"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitTenantApplication } from "./actions";

export function TenantSignupForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await submitTenantApplication(formData);
      if (res.ok) {
        setDone(true);
        toast.success("가입 신청이 접수되었습니다.");
      } else {
        toast.error(res.error);
      }
    });
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">신청 완료</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          관리자가 입주 정보를 확인한 뒤 등록해 드립니다.<br />
          등록이 완료되면 임차인존에서 호실 + 휴대폰 번호로 바로 이용할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">성함 <span className="text-destructive">*</span></label>
          <Input name="name" placeholder="홍길동" required maxLength={40} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">연락처 <span className="text-destructive">*</span></label>
          <Input name="phone" type="tel" placeholder="010-1234-5678" required maxLength={20} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">거주 건물·호실 <span className="text-destructive">*</span></label>
        <Input name="property_info" placeholder="예: ○○빌 302호" required maxLength={300} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">전달 사항 <span className="text-muted-foreground font-normal">(선택)</span></label>
        <Input name="memo" placeholder="입주 예정일, 계약 관련 문의 등" maxLength={1000} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 처리 중...</> : "가입 신청"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        가입 시 개인정보처리방침 및 이용약관에 동의하는 것으로 간주됩니다.
      </p>
    </form>
  );
}
