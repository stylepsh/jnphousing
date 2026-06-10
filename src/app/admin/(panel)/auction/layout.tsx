import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * 경매 섹션 — super(stylepsh) 전용.
 * staff 는 사이드바에서 메뉴가 숨겨질 뿐 아니라 URL 직접 접근도 차단된다.
 */
export default async function AuctionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) redirect("/admin/dashboard");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if ((data as { role: string } | null)?.role !== "super") redirect("/admin/dashboard");

  return <>{children}</>;
}
