import { AdminSidebar } from "../_components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let badgeCount = 0;
  let adminName = "관리자";
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pendingComplaints={badgeCount} adminName={adminName} />
      <div className="flex-1 lg:ml-64">
        {children}
      </div>
    </div>
  );
}
