import type { Metadata } from "next";
import { StaffSignupForm } from "./staff-signup-form";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "직원 계정 신청",
  description: "JNP주택관리 직원 전용 관리자 계정 신청.",
  robots: { index: false },
};

export default function StaffSignupPage() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-xl px-6">
        <div className="mb-8">
          <p className="text-overline text-primary mb-3">JNP 직원 전용</p>
          <h1 className="heading-section-sm text-foreground">직원 계정 신청</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            JNP주택관리 소속 직원의 관리자 화면 계정을 신청합니다.
            대표 관리자가 승인하면 소유주·계약·수금·민원 등 업무 입력을 할 수 있습니다.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-[#E8EBF0] bg-[#F7F8FB] p-5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/70 leading-relaxed">
            신청 즉시 권한이 부여되지 않으며, <strong className="text-foreground">대표 관리자 승인 후</strong>에만
            관리자 화면에 접근할 수 있습니다.
          </p>
        </div>

        <StaffSignupForm />
      </div>
    </section>
  );
}
