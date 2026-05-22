"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  property_id: z.string().uuid().nullable().or(z.literal("")).transform((v) => v || null),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  is_pinned: z.coerce.boolean().default(false),
  is_published: z.coerce.boolean().default(true),
});

export async function upsertNotice(id: string | null, formData: FormData) {
  try {
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.parse({
      ...raw,
      is_pinned: raw.is_pinned === "on" || raw.is_pinned === "true",
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    const supabase = createServiceClient();
    if (id) {
      const { error } = await supabase.from("notices").update(parsed).eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("notices").insert(parsed);
      if (error) return { ok: false, error: error.message };
    }
    revalidatePath("/admin/notices");
    revalidatePath("/tenant/notice");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "오류" };
  }
}

export async function deleteNotice(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/notices");
  return { ok: true };
}
