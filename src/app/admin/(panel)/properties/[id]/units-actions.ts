"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, getClientIp } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";

const schema = z.object({
  property_id: z.string().uuid(),
  unit_no: z.string().min(1).max(20),
  dong: z.string().max(20).optional().or(z.literal("")).transform((v) => v || null),
  ho: z.string().max(20).optional().or(z.literal("")).transform((v) => v || null),
  floor: z.coerce.number().int().optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  area_pyeong: z.coerce.number().positive().optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  area_m2: z.coerce.number().positive().optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  room_count: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  bathroom_count: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  deposit_default: z.coerce.number().int().min(0).default(0),
  rent_default: z.coerce.number().int().min(0).default(0),
  management_fee_default: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(1000).optional().or(z.literal("")).transform((v) => v || null),
});

export async function upsertUnit(id: string | null, formData: FormData) {
  try {
    const ctx = await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }

    const raw = Object.fromEntries(formData.entries());
    // 평 ↔ m² 자동 변환 (평 입력 시 m² 비어있으면 자동)
    if (raw.area_pyeong && !raw.area_m2) {
      const py = Number(raw.area_pyeong);
      if (Number.isFinite(py) && py > 0) {
        raw.area_m2 = (py * 3.3058).toFixed(2);
      }
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();
    const before = id
      ? ((await supabase.from("properties_units").select("*").eq("id", id).maybeSingle()).data as Record<string, unknown> | null)
      : null;

    const { error } = id
      ? await supabase.from("properties_units").update(parsed.data).eq("id", id)
      : await supabase.from("properties_units").insert(parsed.data);
    if (error) {
      console.error("[upsertUnit]", error);
      if (String(error.message).includes("duplicate")) {
        return { ok: false as const, error: "이 건물에 같은 호실 번호가 이미 있습니다." };
      }
      return { ok: false as const, error: "저장 실패" };
    }

    await audit({
      action: id ? "unit.update" : "unit.create",
      resource_type: "property_unit",
      resource_id: id,
      before,
      after: parsed.data,
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidatePath(`/admin/properties/${parsed.data.property_id}`);
    revalidatePath("/admin/properties");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[upsertUnit] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteUnit(id: string) {
  try {
    const ctx = await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const before = (await supabase.from("properties_units").select("*").eq("id", id).maybeSingle()).data as { property_id?: string } | null;
    const { error } = await supabase.from("properties_units").delete().eq("id", id);
    if (error) {
      console.error("[deleteUnit]", error);
      return { ok: false as const, error: "삭제 실패 — 연결된 계약이 있을 수 있습니다." };
    }
    await audit({
      action: "unit.delete",
      resource_type: "property_unit",
      resource_id: id,
      before,
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });
    if (before?.property_id) revalidatePath(`/admin/properties/${before.property_id}`);
    revalidatePath("/admin/properties");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
