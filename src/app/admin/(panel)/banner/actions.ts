"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, "제목 필수").max(200),
  body: z.string().max(2000).optional().or(z.literal("")).transform(v => v || null),
  link_url: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
  link_label: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  theme: z.enum(["info", "important", "event", "holiday"]).default("info"),
  is_active: z.coerce.boolean().default(false),
  start_at: z.string().optional().or(z.literal("")).transform(v => v || null),
  end_at: z.string().optional().or(z.literal("")).transform(v => v || null),
});

export async function upsertBanner(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse({
      ...raw,
      is_active: raw.is_active === "on" || raw.is_active === "true",
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("site_popup_banner").update(parsed.data).eq("id", id)
      : await supabase.from("site_popup_banner").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/banner");
    revalidatePath("/");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
