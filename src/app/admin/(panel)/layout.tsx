import { unstable_cache } from "next/cache";
import { AdminSidebar } from "../_components/sidebar";
import { NotConfiguredBanner } from "@/components/shared/NotConfiguredBanner";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

// admin (panel) 전체를 동적 렌더링 — DB/세션 의존
export const dynamic = "force-dynamic";

/**
 * 사이드바 배지 카운트 — 조직 전체 공통값이라 30초 캐시.
 * 페이지 이동마다 카운트 7개를 다시 조회하던 비용 제거(체감속도 향상).
 */
const getSidebarCounts = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const sixtyDaysAhead = new Date();
    sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);
    const todayISO = new Date().toISOString().slice(0, 10);
    const expiryISO = sixtyDaysAhead.toISOString().slice(0, 10);

    const [c1, c2, c3, c4, c5, c6, c7] = await Promise.all([
      supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "received"),
      supabase.from("rent_invoices").select("*", { count: "exact", head: true }).in("status", ["overdue", "unpaid"]).lt("due_date", todayISO),
      supabase.from("leases").select("*", { count: "exact", head: true }).eq("status", "active").lte("end_date", expiryISO).gte("end_date", todayISO),
      supabase.from("agencies").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("team_todos").select("*", { count: "exact", head: true }).in("status", ["todo", "delayed"]),
      supabase.from("member_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const pendingAgencies = c4.count ?? 0;
    return {
      complaints: c1.count ?? 0,
      overdue: c2.count ?? 0,
      expiring: c3.count ?? 0,
      pendingAgencies,
      newInquiries: c5.count ?? 0,
      openTodos: c6.count ?? 0,
      // 회원 승인 배지 = 가입신청(임대인·임차인·직원) + 부동산 신청
      pendingMembers: (c7.count ?? 0) + pendingAgencies,
    };
  },
  ["admin-sidebar-counts"],
  { revalidate: 30 },
);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  let counts = {
    complaints: 0,
    overdue: 0,
    expiring: 0,
    pendingAgencies: 0,
    newInquiries: 0,
    openTodos: 0,
    pendingMembers: 0,
  };
  let adminName = "관리자";
  let isSuper = false;

  if (configured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: admin } = await supabase
          .from("admin_users")
          .select("name, role")
          .eq("user_id", user.id)
          .maybeSingle();
        const adminRow = admin as { name: string; role: string } | null;
        adminName = adminRow?.name ?? "관리자";
        isSuper = adminRow?.role === "super";

        counts = await getSidebarCounts();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar counts={counts} adminName={adminName} isSuper={isSuper} />
      <div className="flex-1 lg:ml-64 min-w-0">
        <main className="mx-auto w-full max-w-[1600px] px-5 sm:px-7 lg:px-10 pt-16 lg:pt-8 pb-12">
          {configured ? children : (
            <NotConfiguredBanner
              title="관리자 패널 준비 중"
              description=".env.local 의 Supabase 키를 설정하면 모든 데이터가 표시됩니다."
            />
          )}
        </main>
      </div>
    </div>
  );
}
