import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NotConfiguredBanner } from "@/components/shared/NotConfiguredBanner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AgencyNav } from "./_components/agency-nav";

export const dynamic = "force-dynamic";

async function isApprovedAgency() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("agencies")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    return (data as { status?: string } | null)?.status === "approved";
  } catch {
    return false;
  }
}

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  const approved = configured ? await isApprovedAgency() : false;

  return (
    <>
      <Header />
      {approved && <AgencyNav />}
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
