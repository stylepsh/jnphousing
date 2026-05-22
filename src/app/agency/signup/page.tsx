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
