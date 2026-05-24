import type { Metadata } from "next";
import { BankMatchClient } from "./client";

export const metadata: Metadata = { title: "가상계좌 자동 매칭" };

export default function BankMatchPage() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">은행 입금 CSV 자동 매칭</h1>
        <p className="mt-1 text-sm text-muted-foreground">은행에서 받은 입금 내역 CSV를 업로드 → 임차인명·금액 fuzzy 매칭 → 자동 입금 등록</p>
      </div>
      <BankMatchClient />
    </div>
  );
}
