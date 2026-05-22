"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  type: z.enum(["officetel", "apartment", "villa", "commercial"]),
  total_units: z.coerce.number().int().min(0).default(0),
  description: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
  thumbnail_url: z.string().url().or(z.literal("")).transform((v) => v || null),
  display_order: z.coerce.number().int().default(0),
  is_published: z.coerce.boolean().default(true),
});

export async function upsertProperty(id: string | null, formData: FormData) {
  try {
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.parse({
      ...raw,
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    const supabase = createServiceClient();
    if (id) {
      const { error } = await supabase.from("properties").update(parsed).eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("properties").insert(parsed);
      if (error) return { ok: false, error: error.message };
    }
    revalidatePath("/admin/properties");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return { ok: false, error: msg };
  }
}

export async function deleteProperty(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/properties");
  return { ok: true };
}
