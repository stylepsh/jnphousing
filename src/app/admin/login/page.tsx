import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "관리자 로그인",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const errorMessage = {
    unauthorized: "관리자 권한이 없는 계정입니다.",
  }[error ?? ""] ?? null;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-xl bg-blue-500 flex items-center justify-center mb-4">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">JNP 관리자</h1>
          <p className="mt-2 text-sm text-slate-400">관리자 전용 페이지입니다</p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300 text-center">
            {errorMessage}
          </div>
        )}

        <Card>
          <CardContent className="pt-8">
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
