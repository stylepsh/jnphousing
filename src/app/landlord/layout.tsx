import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NotConfiguredBanner } from "@/components/shared/NotConfiguredBanner";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50">
        {configured ? children : (
          <NotConfiguredBanner
            title="임대인 포털 준비 중"
            description="시스템 연결이 완료되면 본인 건물 현황·수익 보고서·정산 내역을 확인하실 수 있습니다."
          />
        )}
      </main>
      <Footer />
    </>
  );
}
