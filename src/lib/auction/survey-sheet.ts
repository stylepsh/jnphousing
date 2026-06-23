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

export function normalizeRow(row: SurveySheetRow): NormalizedSurvey {
  const { ownerName, creditor } = splitOwnerCreditor(row.ownerCreditor);
  const { address, addressShort } = cleanAddress(row.dong, row.addressDetail);
  const meterCheck: Record<string, string> = {};
  if (t(row.mail)) meterCheck.mail = t(row.mail)!;
  if (t(row.meter)) meterCheck.meter = t(row.meter)!;
  const memoParts = [t(row.mgmtOffice), t(row.memo)].filter(Boolean);
  const door = t(row.doorCode);
  return {
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
  let headerIdx = -1;
  for (let i = 0; i < matrix.length; i++) {
    const joined = matrix[i].join("").replace(/\s/g, "");
    if (/사건번호|타경/.test(joined) && /(점유|물건종류|상세주소|주소)/.test(joined)) {
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
