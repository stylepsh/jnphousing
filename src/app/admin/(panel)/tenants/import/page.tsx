import type { Metadata } from "next";
import { TenantImportClient } from "./client";

export const metadata: Metadata = { title: "임차인 CSV 일괄 등록" };

export default function TenantImportPage() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임차인 CSV 일괄 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">대량 임차인 정보를 CSV 파일로 한 번에 등록</p>
      </div>
      <TenantImportClient />
    </div>
  );
}
