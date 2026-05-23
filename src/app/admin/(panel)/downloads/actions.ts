"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
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
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse({
      ...raw,
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("downloads").update(parsed.data).eq("id", id)
      : await supabase.from("downloads").insert(parsed.data);
    if (error) {
      console.error("[upsertDownload]", error);
      return { ok: false as const, error: "저장 실패" };
    }
    revalidatePath("/admin/downloads");
    revalidatePath("/tenant/downloads");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[upsertDownload] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteDownload(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("downloads").delete().eq("id", id);
    if (error) {
      console.error("[deleteDownload]", error);
      return { ok: false as const, error: "삭제 실패" };
    }
    revalidatePath("/admin/downloads");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
