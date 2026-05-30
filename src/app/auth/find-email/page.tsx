import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { FindEmailForm } from "./find-email-form";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "아이디(이메일) 찾기",
  description: `${COMPANY.brand} 로그인 이메일 찾기`,
};

export default function FindEmailPage() {
  return (
    <AuthShell
      title="아이디(이메일) 찾기"
      subtitle="가입 정보로 로그인 이메일을 확인합니다"
      footer={
        <Link href="/login" className="hover:text-white transition-colors">
          ← 로그인으로 돌아가기
        </Link>
      }
    >
      <FindEmailForm />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        임차인은 이메일 없이 호실·휴대폰으로 로그인합니다.{" "}
        <Link href="/tenant/login" className="text-primary hover:underline">임차인 로그인 →</Link>
      </p>
    </AuthShell>
  );
}
