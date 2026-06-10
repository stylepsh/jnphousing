import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { SignupForm } from "./signup-form";
import { Handshake, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "부동산 가입 신청",
  description: "JNP주택관리 부동산 파트너 가입 — 공실 매물 정보를 받아보세요.",
};

export default function AgencySignupPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <Handshake className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            부동산 파트너<br />가입 신청
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            JNP주택관리가 운영하는 모든 건물의 실시간 공실 매물 정보를 받아보세요.
            가입 신청 후 관리자가 사업자 확인을 거쳐 승인합니다.
          </p>

          <div className="mt-8 space-y-3 text-sm">
            {[
              "실시간 공실 매물 현황 열람",
              "보증금·월세·관리비 정확한 조건",
              "사진·상세 정보 다운로드 가능",
              "공실 발생 즉시 알림 (추후 제공)",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/85">{t}</span>
              </div>
            ))}
          </div>

          {/* 제휴 혜택 — 임대인 소개 보상 */}
          <div className="mt-8 rounded-2xl bg-primary text-white p-6">
            <p className="text-xs font-semibold text-white/60 mb-2">파트너 제휴 혜택</p>
            <p className="text-lg font-bold leading-snug">
              임대인을 소개해 주시면<br />업계 최고 수준으로 보답합니다.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                소개로 위탁 계약 성사 시 <strong className="text-white">업계 최고 수수료</strong> 지급
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                또는 해당 물건 운영 기간 동안 <strong className="text-white">매월 수익 일부 지급</strong> 선택 가능
              </li>
            </ul>
            <p className="mt-4 text-xs text-white/55">자세한 조건은 승인 후 담당자가 안내드립니다.</p>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            이미 회원이신가요?{" "}
            <Link href="/agency/login" className="text-primary font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-8">
              <SignupForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
