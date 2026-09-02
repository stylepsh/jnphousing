"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireMutableAdmin, type AdminContext } from "@/lib/auth-guard";
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

/** 마이그레이션 미적용으로 RPC 가 없는 상태인지. PostgREST 는 함수를 못 찾으면 PGRST202. */
function isMissingFunction(e: { code?: string; message?: string }): boolean {
  return e.code === "PGRST202" || /Could not find the function|does not exist/i.test(e.message ?? "");
}

/**
 * 041 미적용 환경용 폴백 — 예전의 다단계 경로.
 * 원자성이 없어 동시 처리 시 로그가 어긋날 수 있다. 041 을 적용하면 쓰이지 않는다.
 */
async function legacyTransition(
  supabase: ReturnType<typeof createServiceClient>,
  ctx: AdminContext,
  propertyId: string,
  from: PipelineState,
  to: PipelineState,
  action: PipelineAction,
  opts: {
    patch?: Record<string, unknown>;
    detail?: string;
    metadata?: Record<string, unknown>;
    inspectionId?: string;
    inspectionPatch?: Record<string, unknown>;
  },
): Promise<{ ok: boolean; from?: PipelineState; to?: PipelineState; error?: string }> {
  // 답사 소속 검증은 폴백에서도 유지한다(보안 조치라 빠지면 안 된다).
  if (opts.inspectionId) {
    const { data: owned } = await supabase
      .from("auction_inspection")
      .select("id")
      .eq("id", opts.inspectionId)
      .eq("auction_property_id", propertyId)
      .maybeSingle();
    if (!owned) return { ok: false, error: "답사 정보가 이 물건에 속하지 않습니다." };
  }

  const { error: updErr } = await supabase
    .from("auction_property")
    .update({
      pipeline_state: to,
      pipeline_entered_at: new Date().toISOString(),
      ...(opts.patch ?? {}),
    })
    .eq("id", propertyId)
    .eq("pipeline_state", from); // 조건부 — 그 사이 바뀌었으면 갱신되지 않는다
  if (updErr) return { ok: false, error: updErr.message };

  await supabase.from("auction_pipeline_event").insert({
    auction_property_id: propertyId,
    from_state: from,
    to_state: to,
    action,
    performed_by_id: ctx.user.id,
    performed_by: ctx.admin.name,
    detail: opts.detail ?? null,
    metadata: opts.metadata ?? null,
  });

  if (opts.inspectionId && opts.inspectionPatch) {
    await supabase
      .from("auction_inspection")
      .update(opts.inspectionPatch)
      .eq("id", opts.inspectionId);
  }

  return { ok: true, from, to };
}

/**
 * 단일 물건 상태전이 코어.
 *
 * 상태 읽기 → 검증 → 갱신 → 이벤트 기록 → (선택) 답사 갱신을 DB 함수
 * auction_apply_transition 한 번으로 처리한다(마이그레이션 041).
 * 함수 안에서 행을 잠그고 기대 상태와 대조하므로, 동시에 두 명이 같은 물건을
 * 처리해도 상태와 이벤트 로그가 어긋나지 않는다.
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
    inspectionId?: string;
    inspectionPatch?: Record<string, unknown>;
  } = {},
): Promise<{ ok: boolean; from?: PipelineState; to?: PipelineState; error?: string }> {
  const supabase = createServiceClient();

  // 다음 상태 계산에는 현재 상태가 필요하다. 이 값은 RPC 에 기대 상태로 넘겨
  // 그 사이에 상태가 바뀌었으면 전이가 거부되게 한다(낙관적 잠금).
  const { data: row, error: readErr } = await supabase
    .from("auction_property")
    .select("id, pipeline_state")
    .eq("id", propertyId)
    .single();
  if (readErr || !row) return { ok: false, error: "물건을 찾을 수 없습니다." };

  const from = (row as { pipeline_state: PipelineState }).pipeline_state ?? "Collected";
  const next = getNextState(from, action, opts.data);
  if (!next.ok || !next.nextState) return { ok: false, error: next.error };

  const { data: res, error: rpcErr } = await supabase.rpc("auction_apply_transition", {
    p_property_id: propertyId,
    p_expected_from: from,
    p_to: next.nextState,
    p_action: action,
    p_performed_by_id: ctx.user.id,
    p_performed_by: ctx.admin.name,
    p_detail: opts.detail ?? next.logMessage,
    p_metadata: opts.metadata ?? null,
    p_patch: opts.patch ?? null,
    p_inspection_id: opts.inspectionId ?? null,
    p_inspection_patch: opts.inspectionPatch ?? null,
  });

  if (rpcErr) {
    // 답사 id 가 다른 물건 소속이면 DB 함수가 예외를 던진다.
    if (/inspection_mismatch/.test(rpcErr.message)) {
      console.error("[doTransition] 답사-물건 불일치", { propertyId, inspectionId: opts.inspectionId });
      return { ok: false, error: "답사 정보가 이 물건에 속하지 않습니다." };
    }
    // 마이그레이션 041 미적용 환경 — 함수가 아직 없다.
    // 전이를 실패시키면 업무가 멈추므로 예전 경로로 처리한다.
    // (트랜잭션 보장이 없으니 041 을 적용하면 자동으로 RPC 경로로 돌아온다.)
    if (isMissingFunction(rpcErr)) {
      console.warn("[doTransition] auction_apply_transition 없음 — 마이그레이션 041 미적용. 폴백 경로 사용");
      return legacyTransition(supabase, ctx, propertyId, from, next.nextState, action, opts);
    }
    console.error("[doTransition]", rpcErr);
    return { ok: false, error: "상태 전이에 실패했습니다." };
  }

  const out = (res ?? {}) as { ok?: boolean; error?: string; from?: string };
  if (!out.ok) {
    if (out.error === "state_conflict") {
      return {
        ok: false,
        error: `다른 사용자가 먼저 처리해 현재 '${STATE_LABELS[out.from as PipelineState] ?? out.from}' 입니다. 새로고침 후 다시 시도해 주세요.`,
      };
    }
    return { ok: false, error: "물건을 찾을 수 없습니다." };
  }

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
    const ctx = await requireMutableAdmin();
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
    const ctx = await requireMutableAdmin();
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const p = parsed.data;

    // 답사 갱신과 상태 전이를 한 트랜잭션으로 처리한다.
    // inspectionId 가 propertyId 소속인지는 DB 함수가 검증한다(클라이언트 값 불신).
    const r = await doTransition(ctx, p.propertyId, "SUBMIT_INSPECTION", {
      metadata: { inspectionId: p.inspectionId, occupancy: p.occupancy, canOpen: p.canOpen },
      inspectionId: p.inspectionId,
      inspectionPatch: {
        occupancy: p.occupancy,
        mail_status: p.mailStatus,
        key_needed: p.keyNeeded,
        can_open: p.canOpen,
        open_memo: p.openMemo,
        merchandising_ready: p.merchandisingReady,
        comment: p.comment,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
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
    const ctx = await requireMutableAdmin();
    const supabase = createServiceClient();

    // 분기 판단용 답사 결과 로드 — 반드시 propertyId 소속 행만 읽는다.
    // (클라이언트가 보낸 두 id 를 각각 믿지 않고 소속 관계를 서버에서 확인)
    const { data: insp, error: inspErr } = await supabase
      .from("auction_inspection")
      .select("id, occupancy, can_open")
      .eq("id", inspectionId)
      .eq("auction_property_id", propertyId)
      .maybeSingle();
    if (inspErr) {
      console.error("[reviewInspection] 답사 조회 실패", inspErr);
      return { ok: false, error: "답사 정보를 불러오지 못했습니다. 다시 시도해 주세요." };
    }
    if (!insp) return { ok: false, error: "답사 정보가 이 물건에 속하지 않습니다." };

    const data: TransitionData = {
      occupancy: (insp as { occupancy?: string }).occupancy,
      canOpen: (insp as { can_open?: string }).can_open,
    };

    const r = await doTransition(ctx, propertyId, action, {
      data,
      detail: memo,
      inspectionId,
      inspectionPatch: {
        status: "reviewed",
        reviewed_by_id: ctx.user.id,
        reviewed_by_name: ctx.admin.name,
        reviewed_at: new Date().toISOString(),
        review_memo: memo ?? null,
      },
    });
    if (!r.ok) return { ok: false, error: r.error };

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const batchReviewSchema = z.object({
  items: z
    .array(
      z.object({
        inspectionId: z.string().uuid(),
        propertyId: z.string().uuid(),
      }),
    )
    .min(1, "선택된 항목이 없습니다"),
  action: z.enum(["APPROVE", "REQUEST_RECHECK", "MARK_OCCUPIED", "REJECT"]),
});

/** 다건 일괄 검토 결정 */
export async function batchReviewInspections(
  items: { inspectionId: string; propertyId: string }[],
  action: "APPROVE" | "REQUEST_RECHECK" | "MARK_OCCUPIED" | "REJECT",
): Promise<ActionResult> {
  try {
    const ctx = await requireMutableAdmin();
    const parsed = batchReviewSchema.safeParse({ items, action });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const { items: validItems, action: validAction } = parsed.data;

    const supabase = createServiceClient();
    let count = 0;

    // 조사 정보는 한 번에 읽는다 — 건별 조회하면 50건 승인에 왕복 100회가 된다.
    // 답사 정보는 한 번에 읽되 auction_property_id 도 함께 가져와 소속을 서버에서 대조한다.
    // id 목록이 길면 URL 이 한도를 넘으므로 청크로 나눠 조회한다.
    const inspById = new Map<string, { id: string; auction_property_id: string; occupancy?: string; can_open?: string }>();
    const allIds = validItems.map((v) => v.inspectionId);
    for (let i = 0; i < allIds.length; i += 200) {
      const { data: inspRows, error: inspErr } = await supabase
        .from("auction_inspection")
        .select("id, auction_property_id, occupancy, can_open")
        .in("id", allIds.slice(i, i + 200));
      if (inspErr) {
        console.error("[batchReviewInspections] 답사 조회 실패", inspErr);
        return { ok: false, error: "답사 정보를 불러오지 못했습니다. 다시 시도해 주세요." };
      }
      for (const r of (inspRows ?? []) as { id: string; auction_property_id: string; occupancy?: string; can_open?: string }[]) {
        inspById.set(r.id, r);
      }
    }

    // 전이는 물건별 상태 검증이 필요해 순차 유지.
    // 답사 갱신은 각 전이와 같은 트랜잭션 안에서 처리된다(041 RPC).
    const reviewedAt = new Date().toISOString();
    let mismatched = 0;
    for (const { inspectionId, propertyId } of validItems) {
      const insp = inspById.get(inspectionId);
      // 클라이언트가 짝지어 보낸 두 id 를 그대로 믿지 않는다.
      if (!insp || insp.auction_property_id !== propertyId) {
        mismatched++;
        continue;
      }
      const data: TransitionData = { occupancy: insp.occupancy, canOpen: insp.can_open };
      const r = await doTransition(ctx, propertyId, validAction, {
        data,
        inspectionId,
        inspectionPatch: {
          status: "reviewed",
          reviewed_by_id: ctx.user.id,
          reviewed_by_name: ctx.admin.name,
          reviewed_at: reviewedAt,
        },
      });
      if (!r.ok) continue;
      count++;
    }

    revalidateAll();
    if (mismatched > 0) {
      console.error("[batchReviewInspections] 소속 불일치", { mismatched });
      return { ok: true, count, error: `${mismatched}건은 답사-물건 정보가 맞지 않아 제외했습니다.` };
    }
    return { ok: true, count };
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

/** 상품화 작업 비용 항목 추가 (total_work_cost 는 DB 트리거가 자동 집계) */
export async function addWorkItem(input: z.input<typeof workItemSchema>): Promise<ActionResult> {
  try {
    const ctx = await requireMutableAdmin();
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

// 수동 이동 허용 전이표 — 이 목록에 없는 이동은 거부한다.
const MANUAL_MOVE_ALLOWED: Record<string, string[]> = {
  Approved: ["WorkPrep", "Merchandising", "Available", "OccupiedHold", "Rejected"],
  WorkPrep: ["Approved", "Merchandising", "Available", "OccupiedHold", "Rejected"],
  Merchandising: ["Approved", "WorkPrep", "Available", "OccupiedHold", "Rejected"],
  Available: ["Approved", "WorkPrep", "Merchandising", "OccupiedHold", "Rejected"],
  OccupiedHold: ["Approved", "Rejected"],
  Recheck: ["Approved", "Rejected"],
};

/**
 * 유연한 수동 단계 이동 + 소프트 삭제(Rejected).
 * MANUAL_MOVE_ALLOWED 전이표로 허용된 이동만 진행한다.
 */
export async function moveAuctionStage(propertyId: string, target: string): Promise<ActionResult> {
  try {
    const ctx = await requireMutableAdmin();
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

    if (from !== to) {
      const allowed = MANUAL_MOVE_ALLOWED[from];
      if (!allowed || !allowed.includes(to)) {
        return {
          ok: false,
          error: `'${STATE_LABELS[from] ?? from}' 에서 '${STATE_LABELS[to] ?? to}' 로는 이동할 수 없습니다.`,
        };
      }
    }

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
