import type { Metadata } from "next";
import Link from "next/link";
import { TenantSignupForm } from "./tenant-signup-form";
import { KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "임차인 회원가입",
  description: "민원·AS 온라인 접수와 내 계약 확인을 위한 임차인 가입 신청.",
};

export default function TenantSignupPage() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-xl px-6">
        <div className="mb-8">
          <p className="text-overline text-primary mb-3">입주민(임차인)</p>
          <h1 className="heading-section-sm text-foreground">임차인 가입 신청</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            민원·AS를 전화 없이 온라인으로 접수하고 답변을 확인할 수 있습니다.
            관리자가 입주 정보를 확인한 뒤 등록해 드립니다.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-[#E8EBF0] bg-[#F7F8FB] p-5 flex items-start gap-3">
          <KeyRound className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/70 leading-relaxed">
            <p className="font-semibold text-foreground mb-0.5">이미 입주 중이신가요?</p>
            <p>
              JNP 관리 건물 입주민은 가입 없이 <Link href="/tenant/login" className="text-primary font-semibold underline underline-offset-2">임차인존 로그인</Link>
              (호실 + 휴대폰 끝 4자리)으로 바로 이용 가능합니다.
            </p>
          </div>
        </div>

        <TenantSignupForm />
      </div>
    </section>
  );
}
