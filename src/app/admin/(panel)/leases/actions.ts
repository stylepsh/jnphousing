"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";

const baseSchema = z.object({
  lease_type: z.enum(["long_term", "short_term"]),
  unit_id: z.string().uuid(),
  landlord_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  move_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deposit: z.coerce.number().int().min(0).default(0),
  rent_amount: z.coerce.number().int().min(0).default(0),
  rent_cycle: z.enum(["monthly", "weekly", "daily"]),
  rent_day: z.coerce.number().int().min(1).max(31).optional().nullable(),
  management_fee: z.coerce.number().int().min(0).default(0),
  vat_included: z.coerce.boolean().default(false),
  fee_type: z.enum(["percent", "fixed"]),
  fee_percent: z.coerce.number().min(0).max(100).optional().nullable(),
  fee_fixed: z.coerce.number().int().min(0).optional().nullable(),
  overdue_annual_rate: z.coerce.number().min(0).max(100).default(12),
  special_terms: z.string().max(5000).optional().or(z.literal("")).transform((v) => v || null),
  contract_source_type: z.enum(["direct", "broker", "referral", "other"]).default("direct"),
  contract_source_name: z.string().max(200).optional().or(z.literal("")).transform((v) => v || null),
  contract_source_contact: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  contract_source_memo: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
});

export async function upsertLease(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const raw = Object.fromEntries(formData.entries());
    const normalized = {
      ...raw,
      vat_included: raw.vat_included === "on" || raw.vat_included === "true",
      move_in_date: raw.move_in_date === "" ? null : raw.move_in_date,
      rent_day: raw.rent_day === "" ? null : raw.rent_day,
      fee_percent: raw.fee_percent === "" ? null : raw.fee_percent,
      fee_fixed: raw.fee_fixed === "" ? null : raw.fee_fixed,
    };
    const parsed = baseSchema.safeParse(normalized);
    if (!parsed.success) {
      return { ok: false as const, error: "입력값을 확인해 주세요.", details: parsed.error.flatten() };
    }
    const d = parsed.data;

    // 비즈니스 제약 (DB CHECK 와 동일 검증, 빠른 피드백)
    if (d.end_date < d.start_date) return { ok: false as const, error: "종료일이 시작일보다 빠릅니다." };
    if (d.rent_cycle === "monthly" && d.rent_day == null) {
      return { ok: false as const, error: "월별 청구는 청구일(rent_day)을 지정해 주세요." };
    }
    if (d.rent_cycle !== "monthly" && d.rent_day != null) {
      return { ok: false as const, error: "주/일 단위 청구는 청구일을 비워주세요." };
    }
    if (d.fee_type === "percent" && d.fee_percent == null) {
      return { ok: false as const, error: "비율 모드는 수수료율(%)을 입력해 주세요." };
    }
    if (d.fee_type === "fixed" && d.fee_fixed == null) {
      return { ok: false as const, error: "정액 모드는 수수료 금액을 입력해 주세요." };
    }

    const payload = {
      lease_type: d.lease_type,
      unit_id: d.unit_id,
      landlord_id: d.landlord_id,
      tenant_id: d.tenant_id,
      start_date: d.start_date,
      move_in_date: d.move_in_date ?? null,
      end_date: d.end_date,
      deposit: d.deposit,
      rent_amount: d.rent_amount,
      rent_cycle: d.rent_cycle,
      rent_day: d.rent_day,
      management_fee: d.management_fee,
      vat_included: d.vat_included,
      fee_type: d.fee_type,
      fee_percent: d.fee_type === "percent" ? d.fee_percent : null,
      fee_fixed: d.fee_type === "fixed" ? d.fee_fixed : null,
      overdue_annual_rate: d.overdue_annual_rate,
      special_terms: d.special_terms,
      contract_source_type: d.contract_source_type,
      contract_source_name: d.contract_source_name,
      contract_source_contact: d.contract_source_contact,
      contract_source_memo: d.contract_source_memo,
    };

    const supabase = createServiceClient();
    if (id) {
      const { error } = await supabase.from("leases").update(payload).eq("id", id);
      if (error) {
        console.error("[upsertLease]", error);
        return { ok: false as const, error: "저장 실패 — 제약 위반이 있을 수 있습니다." };
      }
      return { ok: true as const, id };
    } else {
      const { data, error } = await supabase
        .from("leases")
        .insert({ ...payload, status: "draft" })
        .select("id")
        .single();
      if (error) {
        console.error("[upsertLease insert]", error);
        return { ok: false as const, error: "등록 실패 — 제약 위반이 있을 수 있습니다." };
      }
      const newId = (data as { id: string }).id;
      await supabase.from("lease_events").insert({
        lease_id: newId,
        event_type: "created",
        payload: { lease_type: d.lease_type },
      });
      revalidatePath("/admin/leases");
      return { ok: true as const, id: newId };
    }
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[upsertLease] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteLease(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    // 안전: status=draft 만 삭제 허용
    const { data } = await supabase.from("leases").select("status").eq("id", id).maybeSingle();
    const lease = data as { status: string } | null;
    if (!lease) return { ok: false as const, error: "찾을 수 없음" };
    if (lease.status !== "draft") {
      return { ok: false as const, error: "draft 상태가 아닌 계약은 삭제할 수 없습니다. 해지를 사용하세요." };
    }
    const { error } = await supabase.from("leases").delete().eq("id", id);
    if (error) {
      console.error("[deleteLease]", error);
      return { ok: false as const, error: "삭제 실패" };
    }
    revalidatePath("/admin/leases");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
