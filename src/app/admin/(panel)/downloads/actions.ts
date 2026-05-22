"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  category: z.enum(["contract", "guide", "form"]),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal("")).transform((v) => v || null),
  file_url: z.string().url(),
  file_size_kb: z.coerce.number().int().min(0).optional().nullable(),
  version: z.string().max(50).optional().or(z.literal("")).transform((v) => v || null),
  display_order: z.coerce.number().int().default(0),
  is_published: z.coerce.boolean().default(true),
});

export async function upsertDownload(id: string | null, formData: FormData) {
  try {
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.parse({
      ...raw,
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    const supabase = createServiceClient();
    if (id) {
      const { error } = await supabase.from("downloads").update(parsed).eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("downloads").insert(parsed);
      if (error) return { ok: false, error: error.message };
    }
    revalidatePath("/admin/downloads");
    revalidatePath("/tenant/downloads");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "오류" };
  }
}

export async function deleteDownload(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("downloads").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/downloads");
  return { ok: true };
}
