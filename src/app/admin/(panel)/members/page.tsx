import { redirect } from "next/navigation";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MembersClient, type ApplicationRow, type PendingAgencyRow, type OwnerOption } from "./members-client";
import { StaffAccounts, type StaffAccount } from "./staff-accounts";

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

  // 직원 계정 목록 + 로그인 아이디 (auth 이메일은 service role 로만 볼 수 있다 — 이 화면은 super 전용)
  const service = createServiceClient();
  const [adminsRes, usersRes] = await Promise.all([
    service.from("admin_users").select("id, user_id, name, role").order("created_at"),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  type AuthUser = { id: string; email?: string; last_sign_in_at?: string };
  const authById = new Map(((usersRes.data?.users ?? []) as AuthUser[]).map((u) => [u.id, u]));
  const accounts: StaffAccount[] = ((adminsRes.data ?? []) as { id: string; user_id: string; name: string; role: StaffAccount["role"] }[])
    .map((a) => {
      const email = authById.get(a.user_id)?.email ?? "";
      return {
        adminId: a.id,
        userId: a.user_id,
        name: a.name,
        role: a.role,
        email,
        loginId: email.endsWith("@jnphousing.com") ? email.replace("@jnphousing.com", "") : email,
        lastSignIn: authById.get(a.user_id)?.last_sign_in_at ?? null,
        isMe: a.user_id === user.id,
      };
    });

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
      <div className="mb-8"><StaffAccounts accounts={accounts} /></div>
      <MembersClient
        applications={(appsRes.data ?? []) as ApplicationRow[]}
        pendingAgencies={(agenciesRes.data ?? []) as PendingAgencyRow[]}
        owners={(ownersRes.data ?? []) as OwnerOption[]}
      />
    </div>
  );
}
