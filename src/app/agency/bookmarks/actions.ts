"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleBookmark(vacancyId: string): Promise<{ ok: boolean; bookmarked?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "로그인 필요" };

    const { data: agency } = await supabase
      .from("agencies")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    const a = agency as { id: string; status: string } | null;
    if (!a || a.status !== "approved") return { ok: false, error: "승인된 회원만 사용 가능" };

    const service = createServiceClient();
    const { data: existing } = await service
      .from("agency_bookmarks")
      .select("agency_id")
      .eq("agency_id", a.id)
      .eq("vacancy_id", vacancyId)
      .maybeSingle();

    if (existing) {
      await service.from("agency_bookmarks").delete().eq("agency_id", a.id).eq("vacancy_id", vacancyId);
      await service.from("agency_activity_log").insert({ agency_id: a.id, vacancy_id: vacancyId, action: "unbookmark" });
      revalidatePath("/agency/bookmarks");
      revalidatePath("/agency/vacancies");
      return { ok: true, bookmarked: false };
    } else {
      await service.from("agency_bookmarks").insert({ agency_id: a.id, vacancy_id: vacancyId });
      await service.from("agency_activity_log").insert({ agency_id: a.id, vacancy_id: vacancyId, action: "bookmark" });
      revalidatePath("/agency/bookmarks");
      revalidatePath("/agency/vacancies");
      return { ok: true, bookmarked: true };
    }
  } catch (e) {
    console.warn("[toggleBookmark]", e);
    return { ok: false, error: "처리 중 오류" };
  }
}
