import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "비밀번호 재설정",
  description: `${COMPANY.brand} 새 비밀번호 설정`,
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="새 비밀번호 설정"
      subtitle="안전한 새 비밀번호를 입력해 주세요"
      footer={
        <Link href="/login" className="hover:text-white transition-colors">
          ← 로그인으로 돌아가기
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
