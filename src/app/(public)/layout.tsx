import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { OrganizationJsonLd } from "@/components/shared/JsonLd";
import { PopupBanner } from "@/components/shared/PopupBanner";
import { Phone, MessageCircle } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrganizationJsonLd />
      <PopupBanner />
      <Header />
      {children}
      <Footer />

      {/* 모바일 하단 콘텐츠 스페이서 (고정 CTA 바에 가려지지 않게) */}
      <div className="lg:hidden h-[72px]" aria-hidden />

      {/* 모바일 하단 고정 CTA 바 */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-border shadow-2xl shadow-black/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <a href="tel:01075086916" className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white rounded-xl h-12 text-sm font-semibold transition-all active:scale-[0.98]">
            <Phone className="h-4 w-4" /> 전화 상담
          </a>
          <a href="https://open.kakao.com/o/scZWs5vi" target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 bg-[#FEE500] text-[#3C1E1E] rounded-xl h-12 text-sm font-semibold transition-all active:scale-[0.98]">
            <MessageCircle className="h-4 w-4" /> 카카오톡 상담
          </a>
        </div>
      </div>
    </>
  );
}
