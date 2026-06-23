"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, type AdminContext } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import {
  getNextState,
  STATE_LABELS,
  type PipelineAction,
  type PipelineState,
  type TransitionData,
} from "@/lib/auction/pipeline/state-machine";

export type ActionResult = { ok: boolean; error?: string; count?: number };

function err(e: unknown): ActionResult {
  if (e instanceof AppError) return { ok: false, error: e.message };
  return { ok: false, error: "처리 중 오류가 발생했습니다." };
}

function revalidateAll() {
  for (const p of [
    "/admin/auction/pipeline",
    "/admin/auction/pipeline/assign",
    "/admin/auction/pipeline/review",
    "/admin/auction/pipeline/vacant",
    "/admin/auction/pipeline/lease-ready",
    "/admin/auction/pipeline/leased",
    "/admin/auction/pipeline/occupied",
    "/admin/auction/collection",
  ]) {
    revalidatePath(p);
  }
}

/**
 * 단일 물건 상태전이 코어. 현재 상태 읽고 → 검증 → auction_property 갱신 + 이벤트 기록.
 */
async function doTransition(
  ctx: AdminContext,
  propertyId: string,
  action: PipelineAction,
  opts: {
    data?: TransitionData;
    patch?: Record<string, unknown>;
    detail?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<{ ok: boolean; from?: PipelineState; to?: PipelineState; error?: string }> {
  const supabase = createServiceClient();
  const { data: row, error: readErr } = await supabase
    .from("auction_property")
    .select("id, pipeline_state")
    .eq("id", propertyId)
    .single();
  if (readErr || !row) return { ok: false, error: "물건을 찾을 수 없습니다." };

  const from = (row as { pipeline_state: PipelineState }).pipeline_state ?? "Collected";
  const next = getNextState(from, action, opts.data);
  if (!next.ok || !next.nextState) return { ok: false, error: next.error };

  const { error: updErr } = await supabase
    .from("auction_property")
    .update({
      pipeline_state: next.nextState,
      pipeline_entered_at: new Date().toISOString(),
      ...(opts.patch ?? {}),
    })
    .eq("id", propertyId);
  if (updErr) return { ok: false, error: updErr.message };

  await supabase.from("auction_pipeline_event").insert({
    auction_property_id: propertyId,
    from_state: from,
    to_state: next.nextState,
    action,
    performed_by_id: ctx.user.id,
    performed_by: ctx.admin.name,
    detail: opts.detail ?? next.logMessage,
    metadata: opts.metadata ?? null,
  });

  return { ok: true, from, to: next.nextState };
}

/** 범용 단순 전이 (버튼 1클릭용) */
export async function runAction(
  propertyId: string,
  action: PipelineAction,
  detail?: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const r = await doTransition(ctx, propertyId, action, { detail });
    if (!r.ok) return { ok: false, error: r.error };
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** 수집 풀 → 답사 선정 (Collected → Selected), 다건 */
export async function selectForSurvey(propertyIds: string[]): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    if (propertyIds.length === 0) return { ok: false, error: "선택된 물건이 없습니다." };
    let count = 0;
    for (const id of propertyIds) {
      const r = await doTransition(ctx, id, "SELECT");
      if (r.ok) count++;
    }
    revalidateAll();
    return { ok: true, count };
  } catch (e) {
    return err(e);
  }
}

/** 다건 제외 (any → Rejected) */
export async function rejectProperties(propertyIds: string[], reason?: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    let count = 0;
    for (const id of propertyIds) {
      const r = await doTransition(ctx, id, "REJECT", { detail: reason });
      if (r.ok) count++;
    }
    revalidateAll();
    return { ok: true, count };
  } catch (e) {
    return err(e);
  }
}

const assignSchema = z.object({
  propertyIds: z.array(z.string().uuid()).min(1, "물건을 선택하세요"),
  inspectorId: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  inspectorName: z.string().min(1, "답사자 이름을 입력하세요").max(100),
});

/** 답사 배정: Inspection 생성 + Selected/Recheck → Inspecting */
export async function assignInspection(input: z.input<typeof assignSchema>): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const parsed = assignSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const { propertyIds, inspectorId, inspectorName } = parsed.data;
    const supabase = createServiceClient();

    let count = 0;
    for (const id of propertyIds) {
      const r = await doTransition(ctx, id, "ASSIGN_INSPECTION", {
        detail: `${inspectorName} 배정`,
      });
      if (!r.ok) continue;
      await supabase.from("auction_inspection").insert({
        auction_property_id: id,
        inspector_id: inspectorId,
        inspector_name: inspectorName,
        requested_by_id: ctx.user.id,
        requested_by_name: ctx.admin.name,
        status: "assigned",
      });
      count++;
    }
    revalidateAll();
    revalidatePath("/admin/auction/inspect");
    return { ok: true, count };
  } catch (e) {
    return err(e);
  }
}

const submitSchema = z.object({
  inspectionId: z.string().uuid(),
  propertyId: z.string().uuid(),
  occupancy: z.enum(["vacant", "occupied", "recheck"]),
  mailStatus: z.enum(["none", "normal", "overflow"]),
  keyNeeded: z.boolean().default(false),
  canOpen: z.enum(["possible", "impossible", "admin_check"]),
  openMemo: z.string().max(2000).optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  merchandisingReady: z.enum(["possible", "hold", "impossible"]),
  comment: z.string().min(1, "현장 메모는 필수입니다").max(2000),
});

/** 답사 제출 (답사자 포털): Inspection 갱신 + Inspecting → Reviewing */
export async function submitInspection(input: z.input<typeof submitSchema>): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const p = parsed.data;
    const supabase = createServiceClient();

    const { error: upErr } = await supabase
      .from("auction_inspection")
      .update({
        occupancy: p.occupancy,
        mail_status: p.mailStatus,
        key_needed: p.keyNeeded,
        can_open: p.canOpen,
        open_memo: p.openMemo,
        merchandising_ready: p.merchandisingReady,
        comment: p.comment,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", p.inspectionId);
    if (upErr) return { ok: false, error: upErr.message };

    const r = await doTransition(ctx, p.propertyId, "SUBMIT_INSPECTION", {
      metadata: { inspectionId: p.inspectionId, occupancy: p.occupancy, canOpen: p.canOpen },
    });
    if (!r.ok) return { ok: false, error: r.error };

    revalidateAll();
    revalidatePath("/admin/auction/inspect");
    revalidatePath(`/admin/auction/inspect/${p.inspectionId}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** 검토 결정: APPROVE / REQUEST_RECHECK / MARK_OCCUPIED / REJECT */
export async function reviewInspection(
  inspectionId: string,
  propertyId: string,
  action: "APPROVE" | "REQUEST_RECHECK" | "MARK_OCCUPIED" | "REJECT",
  memo?: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const supabase = createServiceClient();

    // 분기 판단용 답사 결과 로드
    const { data: insp } = await supabase
      .from("auction_inspection")
      .select("occupancy, can_open")
      .eq("id", inspectionId)
      .single();
    const data: TransitionData = {
      occupancy: (insp as { occupancy?: string } | null)?.occupancy,
      canOpen: (insp as { can_open?: string } | null)?.can_open,
    };

    const r = await doTransition(ctx, propertyId, action, { data, detail: memo });
    if (!r.ok) return { ok: false, error: r.error };

    await supabase
      .from("auction_inspection")
      .update({
        status: "reviewed",
        reviewed_by_id: ctx.user.id,
        reviewed_by_name: ctx.admin.name,
        reviewed_at: new Date().toISOString(),
        review_memo: memo ?? null,
      })
      .eq("id", inspectionId);

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const workItemSchema = z.object({
  propertyId: z.string().uuid(),
  category: z.string().min(1).max(50),
  provider: z.string().max(200).optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  amount: z.coerce.number().int().min(0).default(0),
  workDate: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  memo: z.string().max(1000).optional().transform((v) => (v && v.trim() ? v.trim() : null)),
});

/** 상품화 작업 비용 항목 추가 + total_work_cost 재집계 */
export async function addWorkItem(input: z.input<typeof workItemSchema>): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const parsed = workItemSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const p = parsed.data;
    const supabase = createServiceClient();

    const { error: insErr } = await supabase.from("auction_work_item").insert({
      auction_property_id: p.propertyId,
      category: p.category,
      provider: p.provider,
      amount: p.amount,
      work_date: p.workDate,
      memo: p.memo,
      created_by_id: ctx.user.id,
      created_by: ctx.admin.name,
    });
    if (insErr) return { ok: false, error: insErr.message };

    // 누적비용 재집계
    const { data: items } = await supabase
      .from("auction_work_item")
      .select("amount")
      .eq("auction_property_id", p.propertyId);
    const total = ((items ?? []) as { amount: number }[]).reduce((s, i) => s + (i.amount || 0), 0);
    await supabase
      .from("auction_property")
      .update({ total_work_cost: total })
      .eq("id", p.propertyId);

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const moveTargetSchema = z.enum([
  "Approved",
  "WorkPrep",
  "Merchandising",
  "Available",
  "OccupiedHold",
  "Rejected",
]);

/**
 * 유연한 수동 단계 이동 + 소프트 삭제(Rejected).
 * 상태머신 검증을 우회해 관리자가 자유롭게 단계를 옮길 수 있게 한다.
 */
export async function moveAuctionStage(propertyId: string, target: string): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const parsed = moveTargetSchema.safeParse(target);
    if (!parsed.success) return { ok: false, error: "이동할 단계가 올바르지 않습니다." };
    const to = parsed.data;
    const supabase = createServiceClient();

    const { data: row, error: readErr } = await supabase
      .from("auction_property")
      .select("id, pipeline_state")
      .eq("id", propertyId)
      .single();
    if (readErr || !row) return { ok: false, error: "물건을 찾을 수 없습니다." };

    const from = (row as { pipeline_state: PipelineState }).pipeline_state ?? "Collected";

    const { error: updErr } = await supabase
      .from("auction_property")
      .update({ pipeline_state: to, pipeline_entered_at: new Date().toISOString() })
      .eq("id", propertyId);
    if (updErr) return { ok: false, error: updErr.message };

    await supabase.from("auction_pipeline_event").insert({
      auction_property_id: propertyId,
      from_state: from,
      to_state: to,
      action: "MANUAL_MOVE",
      performed_by_id: ctx.user.id,
      performed_by: ctx.admin.name,
      detail: `수동 이동: ${STATE_LABELS[from] ?? from} → ${STATE_LABELS[to] ?? to}`,
    });

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const handoffSchema = z.object({
  propertyId: z.string().uuid(),
  monthlyRent: z.coerce.number().int().min(0).default(0),
  managementFeeRate: z.coerce.number().min(0).max(100).default(0),
  individualTaxRate: z.coerce.number().min(0).max(100).default(0),
  deposit: z.coerce.number().int().min(0).default(0),
  rentCollectionMemo: z.string().max(200).optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  tenantName: z.string().max(100).optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  startDate: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  endDate: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : null)),
  leaseId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

/**
 * 임대 핸드오프: Available → Leased.
 * 정산 파라미터를 auction_property 에 저장하고, jnp leases 연결 시 lease_id 기록.
 * (실제 jnp lease 레코드 생성은 후속 — 여기선 파이프라인 종료 + 메타 기록)
 */
export async function handoffToLease(input: z.input<typeof handoffSchema>): Promise<ActionResult> {
  try {
    const ctx = await requireAdmin();
    const parsed = handoffSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const p = parsed.data;

    const r = await doTransition(ctx, p.propertyId, "CONTRACT_SIGNED", {
      patch: {
        management_fee_rate: p.managementFeeRate,
        individual_tax_rate: p.individualTaxRate,
        monthly_rent: p.monthlyRent,
        deposit: p.deposit,
        rent_collection_memo: p.rentCollectionMemo,
        tenant_name: p.tenantName,
        ...(p.leaseId ? { lease_id: p.leaseId } : {}),
      },
      detail: p.tenantName ? `${p.tenantName} 계약 체결` : "계약 체결",
      metadata: {
        monthlyRent: p.monthlyRent,
        tenantName: p.tenantName,
        startDate: p.startDate,
        endDate: p.endDate,
      },
    });
    if (!r.ok) return { ok: false, error: r.error };

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
