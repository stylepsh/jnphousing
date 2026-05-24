import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NotConfiguredBanner } from "@/components/shared/NotConfiguredBanner";
import { isSupabaseConfigured } from "@/lib/supabase/server";

// agency 영역 전체 동적 렌더링 — 세션·DB 의존
export const dynamic = "force-dynamic";

export default function AgencyLayout({
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
            title="부동산 회원 시스템 준비 중"
            description="공실 매물 데이터베이스가 곧 연결됩니다. 가입·로그인은 잠시 후 이용 가능합니다."
          />
        )}
      </main>
      <Footer />
    </>
  );
}
