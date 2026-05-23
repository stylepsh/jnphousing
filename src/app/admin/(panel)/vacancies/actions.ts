"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const vacancySchema = z.object({
  property_id: z.string().uuid(),
  unit_number: z.string().min(1).max(20),
  floor: z.coerce.number().int().optional().nullable(),
  area_pyeong: z.coerce.number().positive().optional().nullable(),
  area_m2: z.coerce.number().positive().optional().nullable(),
  room_count: z.coerce.number().int().min(0).optional().nullable(),
  bathroom_count: z.coerce.number().int().min(0).optional().nullable(),
  deposit: z.coerce.number().int().min(0).default(0),
  monthly_rent: z.coerce.number().int().min(0).default(0),
  maintenance_fee: z.coerce.number().int().min(0).default(0),
  move_in_date: z.string().optional().or(z.literal("")).transform((v) => v || null),
  description: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
  status: z.enum(["available", "reserved", "contracted"]).default("available"),
  is_published: z.coerce.boolean().default(true),
});

export async function createVacancy(formData: FormData) {
  try {
    await requireAdmin();
    const raw = Object.fromEntries(formData.entries());
    const parsed = vacancySchema.safeParse({
      ...raw,
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();
    const { error } = await supabase.from("vacancies").insert(parsed.data);
    if (error) {
      console.error("[createVacancy]", error);
      return { ok: false as const, error: "등록 실패" };
    }
    revalidatePath("/admin/vacancies");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[createVacancy] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function updateVacancyStatus(id: string, status: "available" | "reserved" | "contracted") {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    if (!z.enum(["available", "reserved", "contracted"]).safeParse(status).success) {
      return { ok: false as const, error: "잘못된 상태 값" };
    }
    const supabase = createServiceClient();
    const { error } = await supabase.from("vacancies").update({ status }).eq("id", id);
    if (error) {
      console.error("[updateVacancyStatus]", error);
      return { ok: false as const, error: "상태 변경 실패" };
    }
    revalidatePath("/admin/vacancies");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteVacancy(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("vacancies").delete().eq("id", id);
    if (error) {
      console.error("[deleteVacancy]", error);
      return { ok: false as const, error: "삭제 실패" };
    }
    revalidatePath("/admin/vacancies");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
