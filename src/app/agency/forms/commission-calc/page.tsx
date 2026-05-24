import type { Metadata } from "next";
import { CommissionCalculator } from "./calculator";
import { Calculator, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "중개수수료 계산기",
  description: "보증금·월세로 예상 수수료를 즉시 계산",
};

export default function CommissionCalcPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <Link href="/agency/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> 서식 다운로드로 돌아가기
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">부동산 회원 전용</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">중개수수료 자동 계산</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          보증금과 월세를 입력하면 거래 유형(주택/오피스텔/상가)별 법정 한도 내 예상 수수료를 계산합니다.
        </p>
      </header>

      <CommissionCalculator />

      <div className="mt-8 rounded-xl bg-slate-50 border border-border p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">📖 계산 근거</p>
        <p>· 환산보증금 = 보증금 + (월세 × 100)</p>
        <p>· 환산보증금 1억 미만은 월세 × 70 으로 산정</p>
        <p>· 표시 수수료는 임차인 측 한도이며, 임대인 측은 동일하게 별도 지급</p>
        <p>· 부가세 별도. 거래 지역·구체적 조건에 따라 협의 가능</p>
      </div>
    </div>
  );
}
