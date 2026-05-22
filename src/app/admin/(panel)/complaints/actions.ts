"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateComplaint(
  id: string,
  patch: { status?: string; admin_memo?: string; assigned_to?: string },
) {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = { ...patch };
  if (patch.status === "resolved") update.resolved_at = new Date().toISOString();
  const { error } = await supabase.from("complaints").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/complaints");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
