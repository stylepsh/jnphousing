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
  normalizeOwnerName,
  ownerNameAnchor,
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
  alreadyRejected: number; // 이미 거부/처리된 건 (답사 돌린 뒤 풀에서 치운 것 — 재수집 차단)
  blockedOwner: number; // 차단 임대인이라 걸러진 건수
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
    alreadyRejected: 0,
    blockedOwner: 0,
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
    let toImport = targetOnly ? valid.filter((p) => isTargetCreditor(p.creditor)) : valid;

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

    // 차단 임대인 제외 — "이 사람 물건은 아예 안 본다" (재파싱마다 자동 필터)
    const blockedKeys = await fetchBlockedOwnerKeys(supabase);
    const beforeBlock = toImport.length;
    if (blockedKeys.size) {
      toImport = toImport.filter((p) => !blockedKeys.has(normalizeOwnerName(p.ownerName)));
    }
    const blockedOwner = beforeBlock - toImport.length;
    if (toImport.length === 0) {
      return {
        ...empty,
        error: `대상 ${beforeBlock}건이 모두 차단 임대인입니다. (차단 목록에서 해제하면 다시 수집됩니다)`,
        parsedTotal: valid.length,
        hug: stats.HUG,
        sgi: stats.SGI,
        other: stats.OTHER,
        blockedOwner,
      };
    }

    // 중복 차단: 같은 상세주소/사건번호가 "이미 답사 완료(공실/거주/재방문)"인 현장이면 skip
    // (힘들게 답사 돈 곳을 답사자에게 다시 안 보냄).
    //   - 거부(rejected)는 차단하지 않는다 → "관심 없어 풀에서 치운 것"이라 재수집 허용.
    //     (지지옥션 재파싱이 옛 거부건 때문에 통째로 막히던 문제 해결 — 실제 답사한 것만 막는다.)
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
      rejected: 1, // 확정 답사상태가 함께 있으면 그쪽 우선, 거부만 있으면 거부로 분류
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
    let alreadyRejected = 0;
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
      else if (ex === "rejected") alreadyRejected += 1; // 거부/처리된 건 — 재수집 차단
      else alreadyOtherSurveyed += 1; // revisit / skip
      return false;
    });
    const skippedDuplicates = toImport.length - dedupedImport.length;
    const dupDetail = { alreadyVacant, alreadyOccupied, alreadyOtherSurveyed, alreadyPending, alreadyRejected };

    if (dedupedImport.length === 0) {
      return {
        ...empty,
        error:
          `대상 후보가 모두 기존에 있음(신규 답사 대상 0). HUG/SGI ${toImport.length}건 중 ` +
          `이미 공실 ${alreadyVacant} · 거주중 ${alreadyOccupied} · 기타 답사완료 ${alreadyOtherSurveyed} · 미답사 중복 ${alreadyPending} · 거부/처리됨 ${alreadyRejected}.`,
        parsedTotal: valid.length,
        hug: stats.HUG,
        sgi: stats.SGI,
        other: stats.OTHER,
        duplicates: skippedDuplicates,
        ...dupDetail,
        blockedOwner,
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
      blockedOwner,
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

// ============================================================
// 임대인 차단 (수집 영구 제외)
// ============================================================

type ServiceClient = ReturnType<typeof createServiceClient>;

/** 차단 임대인 비교키 집합. 테이블 미생성(마이그 034 미적용)이면 빈 집합 → 기능 무시. */
async function fetchBlockedOwnerKeys(supabase: ServiceClient): Promise<Set<string>> {
  const { data, error } = await supabase.from("auction_owner_blocklist").select("owner_key");
  if (error) return new Set();
  return new Set(((data ?? []) as { owner_key: string }[]).map((r) => r.owner_key));
}

export interface BlockedOwner {
  owner_key: string;
  owner_name: string;
  reason: string | null;
  created_at: string;
}

/** 차단 임대인 목록 (수집 화면 하단 패널). */
export async function listBlockedOwners(): Promise<BlockedOwner[]> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_owner_blocklist")
      .select("owner_key, owner_name, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return [];
    return (data ?? []) as BlockedOwner[];
  } catch {
    return [];
  }
}

/**
 * 임대인 차단 — 차단목록 등록 + 현재 미답사 물건을 풀에서 즉시 제외.
 * 이후 임포트에서는 이름 표기가 흔들려도(회사표기·공백) 정규화 키로 자동 필터.
 */
export async function blockOwner(
  ownerName: string,
  reason?: string,
): Promise<{ ok: boolean; removed?: number; error?: string }> {
  try {
    await requireAdmin();
    const parsed = z
      .object({ ownerName: z.string().trim().min(1, "임대인명이 비어있습니다").max(200), reason: z.string().max(300).optional() })
      .safeParse({ ownerName, reason });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };

    const key = normalizeOwnerName(parsed.data.ownerName);
    if (!key) return { ok: false, error: "차단할 수 없는 임대인명입니다" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("auction_owner_blocklist")
      .upsert(
        { owner_key: key, owner_name: parsed.data.ownerName, reason: parsed.data.reason || null },
        { onConflict: "owner_key" },
      );
    if (error) {
      return {
        ok: false,
        error: /relation .* does not exist|schema cache/i.test(error.message)
          ? "차단 목록 테이블이 없습니다. Supabase SQL Editor 에서 마이그레이션 034 를 실행해주세요."
          : error.message,
      };
    }

    // 현재 풀에 남아있는 그 임대인 미답사 건 정리.
    //   전체 pending 을 긁어와 JS 로 비교하면 PostgREST 행 상한에 잘려 일부만 지워진다
    //   (차단했는데 새로고침하면 그대로 보이는 원인) → 이름/앵커로 DB 에서 좁혀서 처리.
    const anchor = ownerNameAnchor(parsed.data.ownerName);
    const [exactRes, anchorRes] = await Promise.all([
      supabase
        .from("auction_property")
        .select("id, owner_name")
        .eq("survey_status", "pending")
        .eq("owner_name", parsed.data.ownerName),
      anchor
        ? supabase
            .from("auction_property")
            .select("id, owner_name")
            .eq("survey_status", "pending")
            .ilike("owner_name", `%${anchor}%`)
        : Promise.resolve({ data: [] as { id: string; owner_name: string | null }[] }),
    ]);
    const candidates = [...(exactRes.data ?? []), ...(anchorRes.data ?? [])] as {
      id: string;
      owner_name: string | null;
    }[];
    const ids = Array.from(
      new Set(
        candidates.filter((r) => normalizeOwnerName(r.owner_name) === key).map((r) => r.id),
      ),
    );
    let removed = 0;
    // 대량이면 청크로 나눠 update (URL 길이 제한 회피)
    for (let i = 0; i < ids.length; i += 300) {
      const { data: upd } = await supabase
        .from("auction_property")
        .update({ survey_status: "rejected", updated_at: new Date().toISOString() })
        .in("id", ids.slice(i, i + 300))
        .select("id");
      removed += (upd ?? []).length;
    }

    revalidatePath("/admin/auction/collection");
    return { ok: true, removed };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "차단 처리 중 오류가 발생했습니다." };
  }
}

/** 차단 해제 — 목록에서만 제거. 이미 제외된 물건은 되살리지 않는다(다음 임포트부터 다시 들어옴). */
export async function unblockOwner(ownerKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const key = z.string().trim().min(1).safeParse(ownerKey);
    if (!key.success) return { ok: false, error: "잘못된 요청입니다" };

    const supabase = createServiceClient();
    const { error } = await supabase.from("auction_owner_blocklist").delete().eq("owner_key", key.data);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/auction/collection");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "해제 중 오류가 발생했습니다." };
  }
}
