"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveAgency(id: string) {
  const supabaseClient = await createClient();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("agencies")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      reject_reason: null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agencies");
  return { ok: true };
}

export async function rejectAgency(id: string, reason: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("agencies")
    .update({
      status: "rejected",
      reject_reason: reason || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agencies");
  return { ok: true };
}
