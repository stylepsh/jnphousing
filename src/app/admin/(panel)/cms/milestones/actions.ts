"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional().or(z.literal("")).transform(v => (typeof v === "number" ? v : null)),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal("")).transform(v => v || null),
  display_order: z.coerce.number().int().default(0),
  is_published: z.coerce.boolean().default(true),
});

export async function upsertMilestone(id: string | null, formData: FormData) {
  try {
    await requireMutableAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse({
      ...raw,
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    if (!parsed.success) {
      console.error("[upsertMilestone]", parsed.error);
      return { ok: false as const, error: "입력값을 확인해 주세요." };
    }
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("company_milestones").update(parsed.data).eq("id", id)
      : await supabase.from("company_milestones").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/cms/milestones");
    revalidatePath("/about");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteMilestone(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("company_milestones").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/cms/milestones");
    revalidatePath("/about");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
