import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  description: `${COMPANY.brand} 비밀번호 재설정`,
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="비밀번호 찾기"
      subtitle="가입하신 이메일로 재설정 링크를 보내드립니다"
      footer={
        <Link href="/login" className="hover:text-white transition-colors">
          ← 로그인으로 돌아가기
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
