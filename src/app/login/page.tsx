import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { COMPANY } from "@/lib/company";
import { Building2, HomeIcon, ShieldCheck, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "로그인",
  description: `${COMPANY.brand} 통합 로그인`,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  const errorMessage = {
    unauthorized: "권한이 없는 계정입니다.",
    not_approved: "아직 승인되지 않은 계정입니다. 관리자 승인을 기다려 주세요.",
    not_landlord: "임대인 계정으로 등록되지 않았습니다.",
    auth_callback_failed: "로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
    session_expired: "세션이 만료되었습니다. 다시 로그인해 주세요.",
  }[error ?? ""] ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{COMPANY.brand}</h1>
          <p className="mt-2 text-sm text-slate-400">관리자 · 부동산 · 임대인 통합 로그인</p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200 text-center">
            {errorMessage}
          </div>
        )}

        <Card>
          <CardContent className="pt-8">
            <LoginForm next={next} />
          </CardContent>
        </Card>

        <div className="mt-6 rounded-lg bg-slate-800/50 border border-slate-700/50 p-4">
          <p className="text-xs font-semibold text-slate-300 mb-2">로그인 후 자동 안내</p>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> 관리자 → 관리 대시보드
            </li>
            <li className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-emerald-400" /> 부동산 회원 → 공실 매물
            </li>
            <li className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-amber-400" /> 임대인 → 자산 현황·정산
            </li>
          </ul>
        </div>

        <div className="mt-6 space-y-3 text-center">
          <Link
            href="/tenant/login"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
            임차인이세요? 호실·휴대폰으로 인증 →
          </Link>
          <div className="text-xs text-slate-500">
            부동산 회원이 처음이신가요?{" "}
            <Link href="/agency/signup" className="text-blue-400 font-semibold hover:underline">
              가입 신청
            </Link>
          </div>
          <div className="text-xs text-slate-500">
            계정 발급 문의: {COMPANY.contact.phone}
          </div>
        </div>
      </div>
    </div>
  );
}
