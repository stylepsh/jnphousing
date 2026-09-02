import type { Metadata } from "next";
import { RentalImportClient } from "./rental-import-client";

export const metadata: Metadata = { title: "임대 취합 업로드" };

export default function RentalImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">임대 취합 업로드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          부동산에서 받은 내용을 정리한 <strong>JNP_임대취합.xlsx</strong> 를 올리면
          계약·수금 현황이 그래프로 나오고, 수익률을 넣으면 정산 금액이 계산됩니다.
        </p>
      </div>
      <RentalImportClient />
    </div>
  );
}
