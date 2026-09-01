"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";

const STAGES = [
  "filed",
  "appraised",
  "scheduled",
  "bidding",
  "awarded",
  "failed",
  "cancelled",
] as const;

// 빈 문자열을 null로, 금액 문자열을 정수(원)로 정규화
const moneyField = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
    return isNaN(n) ? null : Math.round(n);
  });

const textField = z
  .string()
  .max(2000)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const dateField = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const caseSchema = z.object({
  auctionPropertyId: z.string().uuid().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  propertyLabel: textField,
  caseNumber: z.string().min(1, "사건번호는 필수입니다").max(100),
  court: textField,
  caseType: textField,
  stage: z.enum(STAGES).default("filed"),
  auctionDate: dateField,
  appraisalValue: moneyField,
  minimumBid: moneyField,
  claimAmount: moneyField,
  recoveryMemo: textField,
  auctionUrl: textField,
  lawsuitStatus: textField,
  seizureStatus: textField,
  collectionStatus: textField,
  seizureTarget: textField,
  seizureAmount: moneyField,
  thirdDebtor: textField,
  filingDate: dateField,
  decisionDate: dateField,
  dividendDeadline: dateField,
  tenantResponse: textField,
  assignedLawyer: textField,
  lawyerContact: textField,
  submittedDocs: textField,
  courtDates: textField,
  memo: textField,
});

export type CaseInput = z.input<typeof caseSchema>;
export type ActionResult = { ok: boolean; id?: string; error?: string };

function toRow(p: z.infer<typeof caseSchema>) {
  return {
    auction_property_id: p.auctionPropertyId,
    property_label: p.propertyLabel,
    case_number: p.caseNumber,
    court: p.court,
    case_type: p.caseType,
    stage: p.stage,
    auction_date: p.auctionDate,
    appraisal_value: p.appraisalValue,
    minimum_bid: p.minimumBid,
    claim_amount: p.claimAmount,
    recovery_memo: p.recoveryMemo,
    auction_url: p.auctionUrl,
    lawsuit_status: p.lawsuitStatus,
    seizure_status: p.seizureStatus,
    collection_status: p.collectionStatus,
    seizure_target: p.seizureTarget,
    seizure_amount: p.seizureAmount,
    third_debtor: p.thirdDebtor,
    filing_date: p.filingDate,
    decision_date: p.decisionDate,
    dividend_deadline: p.dividendDeadline,
    tenant_response: p.tenantResponse,
    assigned_lawyer: p.assignedLawyer,
    lawyer_contact: p.lawyerContact,
    submitted_docs: p.submittedDocs,
    court_dates: p.courtDates,
    memo: p.memo,
  };
}

export async function createCase(input: CaseInput): Promise<ActionResult> {
  try {
    await requireMutableAdmin();
    const parsed = caseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_case")
      .insert(toRow(parsed.data))
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/auction/cases");
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "사건 등록 중 오류가 발생했습니다." };
  }
}

export async function updateCase(id: string, input: CaseInput): Promise<ActionResult> {
  try {
    await requireMutableAdmin();
    const parsed = caseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("auction_case")
      .update(toRow(parsed.data))
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/auction/cases");
    revalidatePath(`/admin/auction/cases/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "사건 수정 중 오류가 발생했습니다." };
  }
}

/** 단계만 빠르게 변경 (리스트 인라인) */
export async function updateCaseStage(id: string, stage: string): Promise<ActionResult> {
  try {
    await requireMutableAdmin();
    if (!(STAGES as readonly string[]).includes(stage)) {
      return { ok: false, error: "잘못된 단계값" };
    }
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("auction_case")
      .update({ stage })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/auction/cases");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "단계 변경 중 오류가 발생했습니다." };
  }
}

export async function deleteCase(id: string): Promise<ActionResult> {
  try {
    await requireMutableAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("auction_case").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/auction/cases");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "사건 삭제 중 오류가 발생했습니다." };
  }
}
