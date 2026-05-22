import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "부동산 로그인",
};

export default async function AgencyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  const errorMessage = {
    not_approved: "아직 승인되지 않은 계정입니다. 관리자 승인을 기다려 주세요.",
    unauthorized: "권한이 없습니다.",
    auth_callback_failed: "로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
  }[error ?? ""] ?? null;

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">부동산 로그인</h1>
        <p className="mt-2 text-muted-foreground">JNP주택관리 부동산 파트너 전용</p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-900">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardContent className="pt-8">
          <LoginForm next={next} />
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-center text-muted-foreground">
        아직 회원이 아니신가요?{" "}
        <Link href="/agency/signup" className="text-primary font-semibold hover:underline">
          가입 신청
        </Link>
      </p>
    </div>
  );
}
