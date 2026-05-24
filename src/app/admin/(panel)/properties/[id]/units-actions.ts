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

/* ============ 호실 일괄 등록 ============ */

const bulkSchema = z.object({
  property_id: z.string().uuid(),
  floor_from: z.coerce.number().int().min(-5).max(99),
  floor_to: z.coerce.number().int().min(-5).max(99),
  units_per_floor: z.coerce.number().int().min(1).max(99),
  unit_pattern: z.enum(["{floor}{n:02}", "{floor}-{n}", "{floor}호{n}", "{floor}{n}"]).default("{floor}{n:02}"),
  start_unit_no: z.coerce.number().int().min(1).max(99).default(1),
  dong: z.string().max(20).optional().or(z.literal("")).transform((v) => v || null),
  area_pyeong: z.coerce.number().positive().optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  area_m2: z.coerce.number().positive().optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  room_count: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  bathroom_count: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (v === "" || v == null ? null : Number(v))),
  deposit_default: z.coerce.number().int().min(0).default(0),
  rent_default: z.coerce.number().int().min(0).default(0),
  management_fee_default: z.coerce.number().int().min(0).default(0),
});

function formatUnitNo(pattern: string, floor: number, n: number): string {
  return pattern
    .replace("{floor}", String(floor))
    .replace("{n:02}", String(n).padStart(2, "0"))
    .replace("{n}", String(n));
}

export type BulkResult =
  | { ok: true; inserted: number; skipped: number; skipped_unit_nos: string[] }
  | { ok: false; error: string };

export async function bulkCreateUnits(formData: FormData): Promise<BulkResult> {
  try {
    const ctx = await requireAdmin();

    const raw = Object.fromEntries(formData.entries());
    if (raw.area_pyeong && !raw.area_m2) {
      const py = Number(raw.area_pyeong);
      if (Number.isFinite(py) && py > 0) {
        raw.area_m2 = (py * 3.3058).toFixed(2);
      }
    }

    const parsed = bulkSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "입력값을 확인해 주세요." };
    }
    const d = parsed.data;
    if (d.floor_to < d.floor_from) {
      return { ok: false, error: "끝 층은 시작 층보다 같거나 커야 합니다." };
    }

    const totalFloors = d.floor_to - d.floor_from + 1;
    const totalUnits = totalFloors * d.units_per_floor;
    if (totalUnits > 500) {
      return { ok: false, error: `한 번에 최대 500호실까지 가능합니다 (요청: ${totalUnits}).` };
    }

    // 기존 호실 번호 조회 (중복 회피)
    const supabase = createServiceClient();
    const { data: existingRows } = await supabase
      .from("properties_units")
      .select("unit_no")
      .eq("property_id", d.property_id);
    const existing = new Set(((existingRows as { unit_no: string }[] | null) ?? []).map((r) => r.unit_no));

    const rowsToInsert: Record<string, unknown>[] = [];
    const skippedUnitNos: string[] = [];

    for (let floor = d.floor_from; floor <= d.floor_to; floor++) {
      for (let i = 0; i < d.units_per_floor; i++) {
        const n = d.start_unit_no + i;
        const unit_no = formatUnitNo(d.unit_pattern, floor, n);
        if (existing.has(unit_no)) {
          skippedUnitNos.push(unit_no);
          continue;
        }
        existing.add(unit_no);
        rowsToInsert.push({
          property_id: d.property_id,
          unit_no,
          dong: d.dong,
          floor,
          area_m2: d.area_m2,
          area_pyeong: d.area_pyeong,
          room_count: d.room_count,
          bathroom_count: d.bathroom_count,
          deposit_default: d.deposit_default,
          rent_default: d.rent_default,
          management_fee_default: d.management_fee_default,
        });
      }
    }

    if (rowsToInsert.length === 0) {
      return { ok: false, error: "추가할 호실이 없습니다 (모두 이미 존재함)." };
    }

    const { error } = await supabase.from("properties_units").insert(rowsToInsert);
    if (error) {
      console.error("[bulkCreateUnits]", error);
      return { ok: false, error: "일괄 등록 실패" };
    }

    void audit({
      action: "unit.bulk_create",
      resource_type: "property",
      resource_id: d.property_id,
      after: {
        floor_range: `${d.floor_from}~${d.floor_to}`,
        units_per_floor: d.units_per_floor,
        inserted: rowsToInsert.length,
        skipped: skippedUnitNos.length,
      },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidatePath(`/admin/properties/${d.property_id}`);
    revalidatePath("/admin/properties");
    return {
      ok: true,
      inserted: rowsToInsert.length,
      skipped: skippedUnitNos.length,
      skipped_unit_nos: skippedUnitNos,
    };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    console.error("[bulkCreateUnits] unhandled", e);
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
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
