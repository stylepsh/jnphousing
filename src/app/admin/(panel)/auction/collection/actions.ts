"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  parseAuctionPasteText,
  isTargetCreditor,
  classifyCreditor,
  countByCreditorType,
} from "@/lib/auction/court-auction";

export interface ImportResult {
  ok: boolean;
  error?: string;
  batchName?: string;
  parsedTotal: number;
  hug: number;
  sgi: number;
  other: number;
  duplicates: number;
  // 중복 세부 — 이미 답사한 현장은 답사자 재방문 방지를 위해 제외
  alreadyVacant: number; // 이미 공실 (제외)
  alreadyOccupied: number; // 이미 거주중 (제외)
  alreadyOtherSurveyed: number; // 재방문/제외 등 기타 답사완료 (제외)
  alreadyPending: number; // 미답사 중복 (이미 풀에 있음)
  imported: number;
  importedHug: number;
  importedSgi: number;
  byOwner: Record<string, number>;
}

const importSchema = z.object({
  text: z.string().min(1, "붙여넣은 텍스트가 비어있습니다"),
  batchName: z.string().max(200).optional().or(z.literal("")),
  area: z.string().max(200).optional().or(z.literal("")),
  targetOnly: z.boolean().default(true),
});

/**
 * 경매 물건 일괄 임포트 (HUG + SGI 채권자 필터링)
 * 100건 입력 → HUG 30 + SGI 20 + 기타 50 이면 50건만 저장 + 분류 카운트 반환.
 */
export async function importAuctionText(input: {
  text: string;
  batchName?: string;
  area?: string;
  targetOnly?: boolean;
}): Promise<ImportResult> {
  const empty: ImportResult = {
    ok: false,
    parsedTotal: 0,
    hug: 0,
    sgi: 0,
    other: 0,
    duplicates: 0,
    alreadyVacant: 0,
    alreadyOccupied: 0,
    alreadyOtherSurveyed: 0,
    alreadyPending: 0,
    imported: 0,
    importedHug: 0,
    importedSgi: 0,
    byOwner: {},
  };

  try {
    await requireAdmin();

    const parsed = importSchema.safeParse(input);
    if (!parsed.success) {
      return { ...empty, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const { text, batchName, area, targetOnly } = parsed.data;

    const cases = parseAuctionPasteText(text);
    const valid = cases.filter((p) => p.caseNumber || p.address);
    if (valid.length === 0) {
      return {
        ...empty,
        error: "사건번호/주소 패턴을 찾지 못했습니다. 텍스트 형식을 확인해주세요.",
      };
    }

    const stats = countByCreditorType(valid);
    const toImport = targetOnly ? valid.filter((p) => isTargetCreditor(p.creditor)) : valid;

    if (toImport.length === 0) {
      return {
        ...empty,
        error: `대상 채권자(HUG/SGI)인 건이 없습니다. 파싱 ${valid.length}건 / HUG 0 / SGI 0`,
        parsedTotal: valid.length,
        hug: stats.HUG,
        sgi: stats.SGI,
        other: stats.OTHER,
      };
    }

    const supabase = createServiceClient();

    // 중복 차단: 같은 상세주소가 이미 풀에 존재하면(거부 제외) skip.
    //   - 이전에 답사해 공실/거주중 등으로 확정된 현장은 답사자 재방문 방지를 위해 제외
    //   - 거부(rejected)한 건은 제외 대상에서 빼서 재수집 허용
    const addressesToCheck = Array.from(
      new Set(toImport.map((p) => (p.address || "(주소 미상)").trim())),
    );
    const caseNumsToCheck = Array.from(
      new Set(toImport.map((p) => (p.caseNumber || "").replace(/\s/g, "")).filter(Boolean)),
    );
    const [addrRes, caseRes] = await Promise.all([
      supabase
        .from("auction_property")
        .select("address, survey_status")
        .in("address", addressesToCheck)
        .neq("survey_status", "rejected"),
      caseNumsToCheck.length
        ? supabase
            .from("auction_property")
            .select("case_number, survey_status")
            .in("case_number", caseNumsToCheck)
            .neq("survey_status", "rejected")
        : Promise.resolve({ data: [] as { case_number: string; survey_status: string }[] }),
    ]);
    const existingRows = addrRes.data;

    // 주소/사건번호 → 기존 답사상태(가장 확정적인 상태 우선) 매핑
    const STATUS_RANK: Record<string, number> = {
      vacant: 5,
      occupied: 4,
      revisit: 3,
      skip: 2,
      pending: 1,
    };
    const existingStatusByAddr = new Map<string, string>();
    for (const r of (existingRows ?? []) as { address: string; survey_status: string }[]) {
      const a = r.address.trim();
      const prev = existingStatusByAddr.get(a);
      if (!prev || (STATUS_RANK[r.survey_status] ?? 0) > (STATUS_RANK[prev] ?? 0)) {
        existingStatusByAddr.set(a, r.survey_status);
      }
    }
    // 사건번호 우선 매핑 — 주소 포맷이 달라도 점유 등 답사완료 건 누수 방지
    const existingStatusByCase = new Map<string, string>();
    for (const r of (caseRes.data ?? []) as { case_number: string; survey_status: string }[]) {
      const k = (r.case_number || "").replace(/\s/g, "");
      if (!k) continue;
      const prev = existingStatusByCase.get(k);
      if (!prev || (STATUS_RANK[r.survey_status] ?? 0) > (STATUS_RANK[prev] ?? 0)) {
        existingStatusByCase.set(k, r.survey_status);
      }
    }

    // 이번 임포트 내부 중복도 제거 + 제외 사유 집계
    const seenInBatch = new Set<string>();
    const seenCaseInBatch = new Set<string>();
    let alreadyVacant = 0;
    let alreadyOccupied = 0;
    let alreadyOtherSurveyed = 0;
    let alreadyPending = 0;
    const dedupedImport = toImport.filter((p) => {
      const addr = (p.address || "(주소 미상)").trim();
      const cnum = (p.caseNumber || "").replace(/\s/g, "");
      if ((cnum && seenCaseInBatch.has(cnum)) || seenInBatch.has(addr)) {
        alreadyPending += 1; // 같은 배치 내 중복 (이미 신규 후보로 잡음)
        return false;
      }
      if (cnum) seenCaseInBatch.add(cnum);
      seenInBatch.add(addr);
      // 사건번호 매칭 우선, 없으면 주소 매칭
      const ex = (cnum && existingStatusByCase.get(cnum)) || existingStatusByAddr.get(addr);
      if (!ex) return true; // 신규 — 답사 대상
      if (ex === "vacant") alreadyVacant += 1;
      else if (ex === "occupied") alreadyOccupied += 1;
      else if (ex === "pending") alreadyPending += 1;
      else alreadyOtherSurveyed += 1; // revisit / skip
      return false;
    });
    const skippedDuplicates = toImport.length - dedupedImport.length;
    const dupDetail = { alreadyVacant, alreadyOccupied, alreadyOtherSurveyed, alreadyPending };

    if (dedupedImport.length === 0) {
      return {
        ...empty,
        error:
          `대상 후보가 모두 기존에 있음(신규 답사 대상 0). HUG/SGI ${toImport.length}건 중 ` +
          `이미 공실 ${alreadyVacant} · 거주중 ${alreadyOccupied} · 기타 답사완료 ${alreadyOtherSurveyed} · 미답사 중복 ${alreadyPending}.`,
        parsedTotal: valid.length,
        hug: stats.HUG,
        sgi: stats.SGI,
        other: stats.OTHER,
        duplicates: skippedDuplicates,
        ...dupDetail,
      };
    }

    const today = new Date();
    const batchLabel =
      (batchName && batchName.trim()) ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate(),
      ).padStart(2, "0")} 보증채권 임포트`;

    // 1) 배치 생성
    const { data: batchRow, error: batchErr } = await supabase
      .from("auction_survey_batch")
      .insert({
        name: batchLabel,
        area: area || null,
        status: "created",
        total_count: dedupedImport.length,
      })
      .select("id")
      .single();
    if (batchErr || !batchRow) {
      return { ...empty, error: batchErr?.message ?? "배치 생성 실패" };
    }
    const batchId = (batchRow as { id: string }).id;

    // 2) 물건 일괄 insert
    const toInsert = dedupedImport.map((p) => ({
      batch_id: batchId,
      case_number: p.caseNumber || "(미상)",
      court: p.court ?? null,
      address: p.address || "(주소 미상)",
      address_short: p.addressShort ?? null,
      owner_name: p.ownerName ?? "(소유자 미상)",
      creditor: p.creditor ?? null,
      creditor_type: classifyCreditor(p.creditor),
      category: p.category ?? null,
      appraisal_value: p.appraisalValue != null ? Math.round(p.appraisalValue) : null,
      minimum_bid: p.minimumBid != null ? Math.round(p.minimumBid) : null,
      auction_date: p.auctionDate ?? null,
      dividend_deadline: p.dividendDeadline ?? null,
      raw_text: p.rawText ?? null,
      survey_status: "pending",
    }));

    const { error: insErr } = await supabase.from("auction_property").insert(toInsert);
    if (insErr) {
      // 배치 롤백 시도 (베스트 에포트)
      await supabase.from("auction_survey_batch").delete().eq("id", batchId);
      return { ...empty, error: insErr.message };
    }

    const byOwner: Record<string, number> = {};
    for (const p of dedupedImport) {
      const k = p.ownerName ?? "(소유자 미상)";
      byOwner[k] = (byOwner[k] ?? 0) + 1;
    }
    const importedStats = countByCreditorType(dedupedImport);

    revalidatePath("/admin/auction/collection");
    revalidatePath("/admin/auction/survey");

    return {
      ok: true,
      batchName: batchLabel,
      parsedTotal: valid.length,
      hug: stats.HUG,
      sgi: stats.SGI,
      other: stats.OTHER,
      duplicates: skippedDuplicates,
      ...dupDetail,
      imported: dedupedImport.length,
      importedHug: importedStats.HUG,
      importedSgi: importedStats.SGI,
      byOwner,
    };
  } catch (e) {
    if (e instanceof AppError) return { ...empty, error: e.message };
    return { ...empty, error: "임포트 중 오류가 발생했습니다." };
  }
}

/**
 * 수집 후보 거부 (소프트 삭제) — survey_status='rejected'.
 * 데이터는 보존, 후보 풀에서만 제외.
 */
export async function rejectAuctionProperties(
  ids: string[],
): Promise<{ ok: boolean; rejected?: number; error?: string }> {
  try {
    await requireAdmin();
    const idsValid = z.array(z.string().uuid()).min(1).safeParse(ids);
    if (!idsValid.success) return { ok: false, error: "선택된 항목이 없습니다" };

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_property")
      .update({ survey_status: "rejected", updated_at: new Date().toISOString() })
      .in("id", idsValid.data)
      .neq("survey_status", "rejected")
      .select("id");
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/auction/collection");
    return { ok: true, rejected: (data ?? []).length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}
