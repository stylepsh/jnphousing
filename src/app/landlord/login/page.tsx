import { Card, CardContent } from "@/components/ui/card";
import { LandlordLoginForm } from "./login-form";
import { KeyRound } from "lucide-react";

export const metadata = { title: "임대인 로그인" };

export default async function LandlordLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const errorMessage = {
    not_landlord: "임대인 계정으로 등록되지 않았습니다. 관리자에게 문의 주세요.",
  }[error ?? ""] ?? null;

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="text-center mb-6">
        <div className="h-12 w-12 mx-auto rounded-xl bg-primary text-white flex items-center justify-center mb-3">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">임대인 로그인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          본인 소유 건물·계약·수익 정보를 확인합니다.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900 text-center">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <LandlordLoginForm next={next} />
        </CardContent>
      </Card>

      <p className="mt-5 text-xs text-center text-muted-foreground">
        계정 발급은 관리자에게 요청해 주세요. ({process.env.NODE_ENV === "production" ? "010-7508-6916" : "데모용"})
      </p>
    </div>
  );
}
