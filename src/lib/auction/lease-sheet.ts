// 상품화/임차 엑셀(답사 결과 보기 → 엑셀 받기)에서 현장팀이 채워 온 임차 정보를 읽는 순수 파서.
// 임차인·보증금·월세 중 하나라도 적힌 줄만 "임차 나감"으로 본다.
import { normalizeDepositToWon, normalizeRentToWon, toIsoDate, toText, toWon } from "./rental-workbook";

export interface LeaseRow {
  propertyNo: number | null;
  caseNumber: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
  deposit: number | null;
  monthlyRent: number | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  dueDay: number | null;
  brokerName: string | null;
  brokerPhone: string | null;
  feeRate: number | null;
}

// 긴 별칭 먼저 검사("중개사 연락처"가 "연락처"·"중개사"로 잡히지 않게)
const COLS: [keyof LeaseRow, string[]][] = [
  ["brokerPhone", ["중개사연락처", "중개사전화", "부동산연락처"]],
  ["brokerName", ["중개사", "부동산", "중개업소"]],
  ["tenantPhone", ["임차인연락처", "연락처", "전화", "휴대폰"]],
  ["tenantName", ["임차인", "세입자"]],
  ["deposit", ["보증금"]],
  ["monthlyRent", ["월세", "월임대료", "차임"]],
  ["leaseStart", ["계약시작", "시작일", "입주일"]],
  ["leaseEnd", ["계약종료", "종료일", "만기"]],
  ["dueDay", ["수금일", "납부일"]],
  ["feeRate", ["수수료율"]],
  ["caseNumber", ["사건번호"]],
  ["propertyNo", ["번호"]],
];

export function mapLeaseHeader(header: unknown[]): Partial<Record<keyof LeaseRow, number>> {
  const out: Partial<Record<keyof LeaseRow, number>> = {};
  header.forEach((cell, idx) => {
    const h = toText(cell).replace(/\s/g, "");
    if (!h) return;
    for (const [field, aliases] of COLS) {
      if (out[field] !== undefined) continue;
      if (aliases.some((a) => h.includes(a))) {
        out[field] = idx;
        return;
      }
    }
  });
  return out;
}

const num = (v: unknown): number | null => {
  const s = toText(v);
  const n = Number(s.replace(/[^\d.]/g, ""));
  return s && Number.isFinite(n) && /\d/.test(s) ? n : null;
};

/** 헤더 줄(번호 + 임차인/월세/보증금 칸)을 찾아 그 아래를 읽는다. */
export function parseLeaseMatrix(matrix: unknown[][]): LeaseRow[] {
  const hi = matrix.findIndex((r) => {
    const m = mapLeaseHeader(r);
    return m.propertyNo !== undefined && (m.tenantName !== undefined || m.monthlyRent !== undefined || m.deposit !== undefined);
  });
  if (hi < 0) return [];
  const m = mapLeaseHeader(matrix[hi]);
  const get = (r: unknown[], k: keyof LeaseRow) => (m[k] === undefined ? undefined : r[m[k]!]);
  const out: LeaseRow[] = [];
  for (const r of matrix.slice(hi + 1)) {
    const tenantName = toText(get(r, "tenantName")) || null;
    const rentRaw = toWon(get(r, "monthlyRent"));
    const depRaw = toWon(get(r, "deposit"));
    if (!tenantName && !rentRaw && !depRaw) continue; // 임차 정보 없는 줄(아직 공실·지역 제목줄)
    // 현장에서 "월세 70" 처럼 만원 단위로 적는 경우 보정 (정산 화면과 같은 규칙)
    const rent = normalizeRentToWon(rentRaw);
    const due = num(get(r, "dueDay"));
    out.push({
      propertyNo: num(get(r, "propertyNo")),
      caseNumber: toText(get(r, "caseNumber")).replace(/\s/g, "") || null,
      tenantName,
      tenantPhone: toText(get(r, "tenantPhone")) || null,
      deposit: depRaw ? normalizeDepositToWon(depRaw, rent.converted).value : null,
      monthlyRent: rentRaw ? rent.value : null,
      leaseStart: toIsoDate(get(r, "leaseStart")),
      leaseEnd: toIsoDate(get(r, "leaseEnd")),
      dueDay: due && due >= 1 && due <= 31 ? Math.round(due) : null,
      brokerName: toText(get(r, "brokerName")) || null,
      brokerPhone: toText(get(r, "brokerPhone")) || null,
      feeRate: num(get(r, "feeRate")),
    });
  }
  return out;
}
