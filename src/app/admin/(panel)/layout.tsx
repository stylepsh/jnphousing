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
  const counts = {
    complaints: 0,
    overdue: 0,
    expiring: 0,
    pendingAgencies: 0,
    newInquiries: 0,
  };
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

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() + 60);
        const todayISO = new Date().toISOString().slice(0, 10);
        const expiryISO = sixtyDaysAgo.toISOString().slice(0, 10);

        const [c1, c2, c3, c4, c5] = await Promise.all([
          supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "received"),
          supabase.from("rent_invoices").select("*", { count: "exact", head: true }).in("status", ["overdue", "unpaid"]).lt("due_date", todayISO),
          supabase.from("leases").select("*", { count: "exact", head: true }).eq("status", "active").lte("end_date", expiryISO).gte("end_date", todayISO),
          supabase.from("agencies").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
        ]);
        counts.complaints = c1.count ?? 0;
        counts.overdue = c2.count ?? 0;
        counts.expiring = c3.count ?? 0;
        counts.pendingAgencies = c4.count ?? 0;
        counts.newInquiries = c5.count ?? 0;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar counts={counts} adminName={adminName} />
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
