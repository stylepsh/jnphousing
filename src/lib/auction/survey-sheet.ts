// 답사표(엑셀/CSV) 행 정규화 — 외부 의존 없는 순수 로직.
// O/X/△ 점유 매핑, 임대인·채권자 분리, 주소 정리, 헤더 감지/추출.
import {
  classifyCreditor,
  HUG_CREDITOR_PATTERNS,
  SGI_CREDITOR_PATTERNS,
  type CreditorType,
} from "@/lib/auction/court-auction";
import Papa from "papaparse";

const t = (v: string | null | undefined): string | null => {
  if (v == null) return null;
  const s = String(v).replace(/ /g, " ").trim();
  return s.length ? s : null;
};

export function mapOccupancy(raw: string | null): "vacant" | "occupied" | "recheck" | null {
  const s = t(raw);
  if (!s) return null;
  if (/[△▲]/.test(s) || /세모/.test(s)) return "recheck";
  if (/^[oO0○ㅇ]/.test(s)) return "occupied";
  if (/^[xX×]/.test(s)) return "vacant";
  return null;
}

const ALL_CREDITOR_PATTERNS = [...HUG_CREDITOR_PATTERNS, ...SGI_CREDITOR_PATTERNS];

export function splitOwnerCreditor(raw: string | null): { ownerName: string | null; creditor: string | null } {
  const s = t(raw);
  if (!s) return { ownerName: null, creditor: null };
  for (const p of ALL_CREDITOR_PATTERNS) {
    const m = s.match(p);
    if (m) {
      const creditor = m[0];
      const ownerName = s.replace(m[0], "").trim() || null;
      return { ownerName, creditor };
    }
  }
  return { ownerName: s, creditor: null };
}

export function cleanAddress(
  dong: string | null,
  detail: string | null,
): { address: string; addressShort: string | null } {
  const d = t(detail) ?? "";
  const collapsed = d.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
  let addressShort: string | null = null;
  const bracket = collapsed.match(/\[([^\]]+)\]/);
  if (bracket) addressShort = bracket[1].trim();
  const base = collapsed.replace(/\s*\[[^\]]*\]\s*/g, " ").trim();
  const dongStr = t(dong);
  const address = [dongStr, base].filter(Boolean).join(" ").trim();
  return { address, addressShort };
}

export function mapTriState(raw: string | null, kind: "canOpen" | "merch"): string {
  const s = t(raw);
  if (kind === "canOpen") {
    if (!s) return "admin_check";
    if (/가능|possible/i.test(s) || /^[oO○]/.test(s)) return "possible";
    if (/불가|impossible/i.test(s) || /^[xX×]/.test(s)) return "impossible";
    return "admin_check";
  }
  if (!s) return "hold";
  if (/가능|ready|possible/i.test(s) || /^[oO○]/.test(s)) return "possible";
  if (/불가|impossible/i.test(s) || /^[xX×]/.test(s)) return "impossible";
  return "hold";
}

export function mapMail(mail: string | null, memo: string | null): "none" | "normal" | "overflow" {
  const m = t(mail);
  const memoS = t(memo) ?? "";
  if (/대량|다량|overflow|넘침/.test(memoS)) return "overflow";
  if (!m || /^[xX0×]/.test(m)) return "none";
  return "normal";
}

export interface SurveySheetRow {
  visitNo: string | null;
  dong: string | null;
  addressDetail: string | null;
  caseNumber: string | null;
  category: string | null;
  ownerCreditor: string | null;
  occupancy: string | null;
  canOpen: string | null;
  merch: string | null;
  mail: string | null;
  meter: string | null;
  doorCode: string | null;
  mgmtOffice: string | null;
  memo: string | null;
}

export interface NormalizedSurvey {
  /** 답사지에 인쇄된 원문 번호. 숫자가 아닌 값도 오류 보고를 위해 보존한다. */
  visitNo: string | null;
  /** auction_property.property_no 로 사용할 수 있는 양의 정수일 때만 설정된다. */
  propertyNo: number | null;
  caseNumber: string | null;
  address: string;
  addressShort: string | null;
  ownerName: string | null;
  creditor: string | null;
  creditorType: CreditorType;
  category: string | null;
  occupancy: "vacant" | "occupied" | "recheck" | null;
  canOpen: string;
  merch: string;
  mail: "none" | "normal" | "overflow";
  meterCheck: Record<string, string>;
  doorCode: string | null;
  memo: string | null;
}

function parsePropertyNo(raw: string | null): number | null {
  const value = t(raw);
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeRow(row: SurveySheetRow): NormalizedSurvey {
  const { ownerName, creditor } = splitOwnerCreditor(row.ownerCreditor);
  const { address, addressShort } = cleanAddress(row.dong, row.addressDetail);
  const meterCheck: Record<string, string> = {};
  if (t(row.mail)) meterCheck.mail = t(row.mail)!;
  if (t(row.meter)) meterCheck.meter = t(row.meter)!;
  const memoParts = [t(row.mgmtOffice), t(row.memo)].filter(Boolean);
  const door = t(row.doorCode);
  return {
    visitNo: t(row.visitNo),
    propertyNo: parsePropertyNo(row.visitNo),
    caseNumber: t(row.caseNumber)?.replace(/\s/g, "") ?? null,
    address,
    addressShort,
    ownerName,
    creditor,
    creditorType: classifyCreditor(creditor),
    category: t(row.category),
    occupancy: mapOccupancy(row.occupancy),
    canOpen: mapTriState(row.canOpen, "canOpen"),
    merch: mapTriState(row.merch, "merch"),
    mail: mapMail(row.mail, row.memo),
    meterCheck,
    doorCode: door && !/^[xX]$/.test(door) ? door : null,
    memo: memoParts.length ? memoParts.join(" / ") : null,
  };
}

// ============================================================
// 회수 답사지 → 기존 물건 매칭 (DB와 무관한 순수 무결성 규칙)
// ============================================================

export interface SurveyMatchCandidate {
  id: string;
  propertyNo: number;
  caseNumber: string;
  address: string;
  addressShort: string | null;
  surveyStatus: string;
  pipelineState: string;
}

export type SurveyMatchErrorCode =
  | "INVALID_PROPERTY_NO"
  | "MISSING_IDENTIFIER"
  | "PROPERTY_NOT_FOUND"
  | "AMBIGUOUS_MATCH"
  | "CASE_MISMATCH"
  | "ADDRESS_MISMATCH"
  | "PROTECTED_SURVEY_STATUS"
  | "PIPELINE_REGRESSION";

export type SurveyMatchResolution =
  | { ok: true; candidate: SurveyMatchCandidate; matchedBy: "property_no" | "case_address" }
  | { ok: false; code: SurveyMatchErrorCode; message: string };

const normalizeCaseIdentity = (value: string | null | undefined): string =>
  String(value ?? "").normalize("NFKC").replace(/\s/g, "");

/** 주소 비교 전 표기 차이(공백·쉼표·대괄호 도로명)를 제거한다. */
export const normalizeSurveyAddress = (value: string | null | undefined): string =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/[\s,]+/g, "")
    .toLocaleLowerCase("ko-KR");

function addressMatches(row: NormalizedSurvey, candidate: SurveyMatchCandidate): boolean {
  if (!row.address || normalizeSurveyAddress(row.address) !== normalizeSurveyAddress(candidate.address)) {
    return false;
  }
  if (row.addressShort && candidate.addressShort) {
    return normalizeSurveyAddress(row.addressShort) === normalizeSurveyAddress(candidate.addressShort);
  }
  return true;
}

const PIPELINE_RANK: Record<string, number> = {
  Collected: 0,
  Selected: 1,
  Inspecting: 2,
  Reviewing: 3,
  Approved: 4,
  WorkPrep: 5,
  Merchandising: 6,
  Available: 7,
  Leased: 8,
};

function wouldRegressPipeline(current: string, next: string): boolean {
  if (current === "Rejected" || current === "Leased") return true;
  const currentRank = PIPELINE_RANK[current];
  const nextRank = PIPELINE_RANK[next];
  return currentRank != null && nextRank != null && nextRank < currentRank;
}

/**
 * property_no가 있으면 그것만 식별자로 사용하고 사건번호·주소는 위변조/오입력 검증에 쓴다.
 * 번호가 없는 구형 답사지만 사건번호+정규화 주소가 정확히 한 건일 때만 허용한다.
 */
export function resolveSurveyMatch(
  row: NormalizedSurvey,
  candidates: SurveyMatchCandidate[],
  nextPipelineState: string,
): SurveyMatchResolution {
  let candidate: SurveyMatchCandidate;
  let matchedBy: "property_no" | "case_address";

  if (row.visitNo) {
    if (row.propertyNo == null) {
      return { ok: false, code: "INVALID_PROPERTY_NO", message: `물건번호 '${row.visitNo}'가 올바른 양의 정수가 아닙니다.` };
    }
    const exact = candidates.filter((item) => item.propertyNo === row.propertyNo);
    if (exact.length === 0) {
      return { ok: false, code: "PROPERTY_NOT_FOUND", message: `물건번호 ${row.propertyNo}를 찾을 수 없습니다.` };
    }
    if (exact.length !== 1) {
      return { ok: false, code: "AMBIGUOUS_MATCH", message: `물건번호 ${row.propertyNo}가 ${exact.length}건과 일치합니다.` };
    }
    candidate = exact[0];
    matchedBy = "property_no";

    if (row.caseNumber && normalizeCaseIdentity(row.caseNumber) !== normalizeCaseIdentity(candidate.caseNumber)) {
      return { ok: false, code: "CASE_MISMATCH", message: `물건번호 ${row.propertyNo}의 사건번호가 답사지와 다릅니다.` };
    }
    if (!addressMatches(row, candidate)) {
      return { ok: false, code: "ADDRESS_MISMATCH", message: `물건번호 ${row.propertyNo}의 주소가 답사지와 다릅니다.` };
    }
  } else {
    if (!row.caseNumber || !row.address) {
      return { ok: false, code: "MISSING_IDENTIFIER", message: "물건번호가 없는 행은 사건번호와 주소가 모두 필요합니다." };
    }
    const exact = candidates.filter(
      (item) =>
        normalizeCaseIdentity(item.caseNumber) === normalizeCaseIdentity(row.caseNumber) &&
        addressMatches(row, item),
    );
    if (exact.length === 0) {
      const code = candidates.length > 0 ? "ADDRESS_MISMATCH" : "PROPERTY_NOT_FOUND";
      const message = candidates.length > 0
        ? `사건번호 ${row.caseNumber}와 주소가 함께 일치하는 물건이 없습니다.`
        : `사건번호 ${row.caseNumber}에 해당하는 물건이 없습니다.`;
      return { ok: false, code, message };
    }
    if (exact.length !== 1) {
      return { ok: false, code: "AMBIGUOUS_MATCH", message: `사건번호와 주소가 같은 후보가 ${exact.length}건입니다. 물건번호가 필요합니다.` };
    }
    candidate = exact[0];
    matchedBy = "case_address";
  }

  if (["blocked", "rejected", "skip"].includes(candidate.surveyStatus)) {
    return {
      ok: false,
      code: "PROTECTED_SURVEY_STATUS",
      message: `물건번호 ${candidate.propertyNo}는 보호 상태(${candidate.surveyStatus})여서 변경하지 않았습니다.`,
    };
  }
  if (wouldRegressPipeline(candidate.pipelineState, nextPipelineState)) {
    return {
      ok: false,
      code: "PIPELINE_REGRESSION",
      message: `물건번호 ${candidate.propertyNo}의 진행상태(${candidate.pipelineState})가 후퇴할 수 있어 변경하지 않았습니다.`,
    };
  }

  return { ok: true, candidate, matchedBy };
}

// ============================================================
// 파일 → SurveySheetRow[] 추출 (헤더 자동감지 + 지역명)
// ============================================================

export const HEADER_ALIASES: Record<keyof SurveySheetRow, string[]> = {
  visitNo: ["방문순번", "순번", "no", "번호"],
  dong: ["동", "법정동", "행정동"],
  addressDetail: ["상세 주소", "상세주소", "주소", "소재지"],
  caseNumber: ["사건번호", "타경", "사건"],
  category: ["물건종류", "종류", "용도"],
  ownerCreditor: ["임대인·채권", "임대인", "소유자", "채권"],
  occupancy: ["점유 상태", "점유상태", "점유", "공실여부"],
  canOpen: ["개방가능", "개문", "개방"],
  merch: ["상품화준비", "상품화", "상품"],
  mail: ["우편", "우편물"],
  meter: ["계량기", "검침"],
  doorCode: ["현관비번", "현관", "비번", "비밀번호"],
  mgmtOffice: ["관리실"],
  memo: ["비고", "메모", "특이사항"],
};

// 더 구체적인 별칭이 먼저 매칭되도록 길이 내림차순 후보 사용.
export function mapHeaderToFields(header: string[]): Partial<Record<number, keyof SurveySheetRow>> {
  const map: Partial<Record<number, keyof SurveySheetRow>> = {};
  const used = new Set<keyof SurveySheetRow>();
  header.forEach((cell, idx) => {
    const norm = String(cell ?? "").replace(/\s/g, "");
    if (!norm) return;
    let best: { field: keyof SurveySheetRow; len: number } | null = null;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof SurveySheetRow, string[]][]) {
      if (used.has(field)) continue;
      for (const a of aliases) {
        const an = a.replace(/\s/g, "");
        if (norm.includes(an) && (!best || an.length > best.len)) best = { field, len: an.length };
      }
    }
    if (best) {
      map[idx] = best.field;
      used.add(best.field);
    }
  });
  return map;
}

export function rowsFromMatrix(matrix: string[][]): { region: string | null; rows: SurveySheetRow[] } {
  // 헤더 = '점유'(답사시트의 표식) + 주소/임대인/사건번호 중 하나 포함.
  // 안산/수원처럼 사건번호 칸이 없는 시트도 감지되도록 사건번호 필수 조건 제거.
  let headerIdx = -1;
  for (let i = 0; i < matrix.length; i++) {
    const joined = matrix[i].join("").replace(/\s/g, "");
    if (/점유/.test(joined) && /(상세주소|주소|임대인|사건번호|타경)/.test(joined)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { region: null, rows: [] };

  let region: string | null = null;
  for (let i = 0; i < headerIdx; i++) {
    const first = (matrix[i][0] ?? "").trim();
    if (first) {
      region = first;
      break;
    }
  }

  const fieldByIdx = mapHeaderToFields(matrix[headerIdx]);
  const blank = (): SurveySheetRow => ({
    visitNo: null, dong: null, addressDetail: null, caseNumber: null, category: null,
    ownerCreditor: null, occupancy: null, canOpen: null, merch: null, mail: null,
    meter: null, doorCode: null, mgmtOffice: null, memo: null,
  });

  const rows: SurveySheetRow[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const cells = matrix[i];
    if (!cells || cells.every((c) => !String(c ?? "").trim())) continue;
    const r = blank();
    for (const [idxStr, field] of Object.entries(fieldByIdx)) {
      if (!field) continue;
      const v = cells[Number(idxStr)];
      r[field] = v != null && String(v).trim() ? String(v) : null;
    }
    if (!r.caseNumber && !r.addressDetail) continue;
    rows.push(r);
  }
  return { region, rows };
}

export function extractRowsFromCsv(text: string): { region: string | null; rows: SurveySheetRow[] } {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const matrix = (parsed.data as string[][]).map((row) => row.map((c) => (c ?? "").toString()));
  return rowsFromMatrix(matrix);
}
