import type { Metadata } from "next";
import { LandlordSignupForm } from "./landlord-signup-form";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "임대인 회원가입",
  description: "내 건물의 임차·공실 현황과 정산 내역을 확인하는 임대인존 가입 신청.",
};

const BENEFITS = [
  "내 물건 임차중·공실 현황 실시간 확인",
  "월별 수금·정산 내역과 보고서 열람",
  "위탁 물건 진행 상황 한눈에 파악",
];

export default function LandlordSignupPage() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-xl px-6">
        <div className="mb-10">
          <p className="text-overline text-primary mb-3">임대인 회원</p>
          <h1 className="heading-section-sm text-foreground">임대인 가입 신청</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            신청 후 관리자가 보유 물건과 대조 확인하여 승인해 드립니다.
          </p>
          <ul className="mt-5 space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-foreground/75">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <LandlordSignupForm />
      </div>
    </section>
  );
}
