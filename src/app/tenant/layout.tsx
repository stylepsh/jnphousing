import Link from "next/link";
import { Phone } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { COMPANY } from "@/lib/company";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 공개 헤더 (회사소개 · 서비스 · 관리현장 · 세입자존 · 부동산존 · 관리문의) */}
      <Header />

      <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
        {/* 세입자 전용 안내 바 — 헤더 바로 아래 */}
        <div className="bg-primary text-white border-b border-primary/40">
          <div className="mx-auto max-w-3xl px-4 py-2.5 flex items-center justify-between">
            <Link href="/tenant" className="text-sm font-semibold">
              🏠 입주민 서비스 영역
            </Link>
            <a
              href={COMPANY.contact.phoneHref}
              className="flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1 rounded-full hover:bg-white/25 transition"
            >
              <Phone className="h-3.5 w-3.5" />
              관리실
            </a>
          </div>
        </div>

        <main>{children}</main>
      </div>

      <Footer />
    </>
  );
}
