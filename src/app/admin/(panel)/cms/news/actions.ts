"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(120).optional().transform(v => v?.trim() || null),
  category: z.enum(["general", "press", "update", "holiday", "important"]).default("general"),
  excerpt: z.string().max(300).optional().transform(v => v?.trim() || null),
  content: z.string().min(1).max(20000),
  cover_image_url: z.string().url().optional().or(z.literal("")).transform(v => v || null),
  is_pinned: z.coerce.boolean().default(false),
  is_published: z.coerce.boolean().default(false),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function upsertNewsPost(id: string | null, formData: FormData) {
  try {
    await requireMutableAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse({
      ...raw,
      is_pinned: raw.is_pinned === "on" || raw.is_pinned === "true",
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    if (!parsed.success) {
      console.error("[upsertNewsPost] validation", parsed.error);
      return { ok: false as const, error: "입력값을 확인해 주세요." };
    }

    const data = parsed.data;
    if (!data.slug) data.slug = slugify(data.title) || null;

    // 발행 상태로 처음 변경 시 published_at 설정
    const payload: Record<string, unknown> = { ...data };
    if (data.is_published) {
      payload.published_at = new Date().toISOString();
    }

    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("notices_board").update(payload).eq("id", id)
      : await supabase.from("notices_board").insert(payload);
    if (error) {
      console.error("[upsertNewsPost]", error);
      return { ok: false as const, error: error.message };
    }
    revalidatePath("/admin/cms/news");
    revalidatePath("/news");
    revalidatePath("/");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[upsertNewsPost] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteNewsPost(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("notices_board").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/cms/news");
    revalidatePath("/news");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
