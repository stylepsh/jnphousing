"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateInquiry(
  id: string,
  patch: { status?: string; admin_memo?: string },
) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("inquiries").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
