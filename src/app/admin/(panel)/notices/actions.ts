"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
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
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse({
      ...raw,
      is_pinned: raw.is_pinned === "on" || raw.is_pinned === "true",
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("notices").update(parsed.data).eq("id", id)
      : await supabase.from("notices").insert(parsed.data);
    if (error) {
      console.error("[upsertNotice]", error);
      return { ok: false as const, error: "저장 실패" };
    }
    revalidatePath("/admin/notices");
    revalidatePath("/tenant/notice");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[upsertNotice] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteNotice(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      console.error("[deleteNotice]", error);
      return { ok: false as const, error: "삭제 실패" };
    }
    revalidatePath("/admin/notices");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
