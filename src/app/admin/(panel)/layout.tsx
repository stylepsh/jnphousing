import { AdminSidebar } from "../_components/sidebar";
import { NotConfiguredBanner } from "@/components/shared/NotConfiguredBanner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// admin (panel) 전체를 동적 렌더링 — DB/세션 의존
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  let badgeCount = 0;
  let adminName = "관리자";

  if (configured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: admin } = await supabase
          .from("admin_users")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();
        adminName = ((admin as { name: string } | null)?.name) ?? "관리자";

        const { count } = await supabase
          .from("complaints")
          .select("*", { count: "exact", head: true })
          .eq("status", "received");
        badgeCount = count ?? 0;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pendingComplaints={badgeCount} adminName={adminName} />
      <div className="flex-1 lg:ml-64">
        {configured ? children : (
          <NotConfiguredBanner
            title="관리자 패널 준비 중"
            description=".env.local 의 Supabase 키를 설정하면 모든 데이터가 표시됩니다."
          />
        )}
      </div>
    </div>
  );
}
