import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MembersClient, type ApplicationRow, type PendingAgencyRow, type OwnerOption } from "./members-client";

export const metadata = { title: "회원 승인" };

export default async function MembersPage() {
  if (!isSupabaseConfigured()) redirect("/admin/dashboard");
  const supabase = await createClient();

  // super 전용 페이지 — staff 는 대시보드로
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: adminRow } = await supabase
    .from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
  if ((adminRow as { role: string } | null)?.role !== "super") redirect("/admin/dashboard");

  const [appsRes, agenciesRes, ownersRes] = await Promise.all([
    supabase.from("member_applications").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("agencies").select("id, company_name, representative, phone, business_number, status, created_at")
      .eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("owners").select("id, name, phone").order("name"),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">회원 승인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          홈페이지 가입 신청을 검토하고 승인합니다. 최고 관리자 전용 화면입니다.
        </p>
      </div>
      <MembersClient
        applications={(appsRes.data ?? []) as ApplicationRow[]}
        pendingAgencies={(agenciesRes.data ?? []) as PendingAgencyRow[]}
        owners={(ownersRes.data ?? []) as OwnerOption[]}
      />
    </div>
  );
}
