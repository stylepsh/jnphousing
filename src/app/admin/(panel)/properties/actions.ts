"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
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
    await requireMutableAdmin();
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
      ? await supabase.from("properties").update(parsed.data).eq("id", id)
      : await supabase.from("properties").insert(parsed.data);
    if (error) {
      console.error("[upsertProperty]", error);
      return { ok: false as const, error: "저장 실패" };
    }
    revalidatePath("/admin/properties");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[upsertProperty] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteProperty(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();

    // 안전장치 1: 호실 존재 시 차단
    const { count: unitCount } = await supabase
      .from("properties_units")
      .select("*", { count: "exact", head: true })
      .eq("property_id", id);
    if ((unitCount ?? 0) > 0) {
      return {
        ok: false as const,
        error: `호실 ${unitCount}개가 등록되어 있어 삭제할 수 없습니다. 먼저 호실을 모두 삭제하거나 다른 건물로 이전해 주세요.`,
      };
    }

    // 안전장치 2: 공실 매물 존재 시 차단
    const { count: vacancyCount } = await supabase
      .from("vacancies")
      .select("*", { count: "exact", head: true })
      .eq("property_id", id);
    if ((vacancyCount ?? 0) > 0) {
      return {
        ok: false as const,
        error: `등록된 공실 매물 ${vacancyCount}건이 있어 삭제할 수 없습니다. 먼저 공실 매물을 정리해 주세요.`,
      };
    }

    // 안전장치 3: 공지사항 존재 시 경고만 — 삭제 시 자동 해제됨 (ON DELETE SET NULL)
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      console.error("[deleteProperty]", error);
      return { ok: false as const, error: "삭제 실패: " + error.message };
    }
    revalidatePath("/admin/properties");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
