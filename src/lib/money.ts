/**
 * 금액 유틸 — 모든 금액은 원 단위 integer.
 *
 * 절대 규칙:
 * - 금액 곱셈/나눗셈 결과는 Math.round 또는 Math.floor 로 정수화.
 * - 부가세는 별도 함수로 분리. 원본 금액과 분리 보관.
 * - 비율(percent)은 numeric(5,2) — 코드에서는 0~100 의 number 로 받되 .toFixed(2) 로 직렬화.
 */

import { differenceInCalendarDays, getDaysInMonth } from "date-fns";

/** integer 강제 — 소수가 들어오면 throw (개발 시 버그 조기 발견용). */
export function asWon(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`asWon: invalid number ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new Error(`asWon: 금액은 정수여야 합니다 (${value}). Math.round 후 전달하세요.`);
  }
  return value;
}

/** "1,234,567" 형식. 음수는 △ 접두. */
export function formatWon(value: number): string {
  const v = Math.trunc(value);
  if (v < 0) return `△${(-v).toLocaleString("ko-KR")}`;
  return v.toLocaleString("ko-KR");
}

/** "1,234,567원" */
export function formatWonSuffix(value: number): string {
  return `${formatWon(value)}원`;
}

/** 만 단위 축약: 12,345,000 → "1,234만". 보증금/월세 칩에 사용. */
export function formatWonMan(value: number): string {
  const v = Math.trunc(value);
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const man = Math.floor((abs % 100_000_000) / 10_000);
    return `${v < 0 ? "△" : ""}${eok}억${man ? ` ${man.toLocaleString("ko-KR")}만` : ""}`;
  }
  if (abs >= 10_000) {
    return `${v < 0 ? "△" : ""}${Math.floor(abs / 10_000).toLocaleString("ko-KR")}만`;
  }
  return `${v < 0 ? "△" : ""}${abs.toLocaleString("ko-KR")}`;
}

/* =========================================================================
 * 부가세
 * 한국 부가세율 10%. 임대료에 부가세 포함 여부는 계약(lease.vat_included)에 따름.
 * 결과는 원 단위 정수, 1원 미만 절사(floor).
 * ========================================================================= */

export const VAT_RATE = 0.1;

/** 공급가액에서 부가세액 산출 (공급가액 × 10%, 1원 절사). */
export function vatOf(supplyAmount: number): number {
  return Math.floor(asWon(supplyAmount) * VAT_RATE);
}

/**
 * 부가세 포함 합계에서 공급가액과 부가세 분리.
 * 합계 = 공급가액 + 공급가액 × 0.1 → 공급가액 = 합계 / 1.1
 * 분할 후 합산이 원본과 어긋나지 않도록 부가세는 차감 방식.
 */
export function splitVatInclusive(totalAmount: number): {
  supply: number;
  vat: number;
} {
  const total = asWon(totalAmount);
  const supply = Math.floor(total / 1.1);
  const vat = total - supply;
  return { supply, vat };
}

/** 공급가액 + 부가세 합계. */
export function withVat(supplyAmount: number): number {
  const supply = asWon(supplyAmount);
  return supply + vatOf(supply);
}

/* =========================================================================
 * 비율 (위탁수수료 percent)
 * numeric(5,2) — 0.00 ~ 999.99 사이, 소수점 2자리.
 * ========================================================================= */

/** 비율을 numeric(5,2)에 저장 가능한 문자열로 정규화. 음수·999.99 초과 throw. */
export function normalizePercent(percent: number): string {
  if (!Number.isFinite(percent) || percent < 0 || percent > 999.99) {
    throw new Error(`normalizePercent: 비율 범위 0.00 ~ 999.99 (${percent})`);
  }
  return percent.toFixed(2);
}

/** 금액에 비율 적용 (정수 반환, 1원 절사). 위탁수수료 계산용. */
export function applyPercent(amount: number, percent: number): number {
  const a = asWon(amount);
  if (!Number.isFinite(percent) || percent < 0) {
    throw new Error(`applyPercent: 잘못된 비율 ${percent}`);
  }
  return Math.floor((a * percent) / 100);
}

/* =========================================================================
 * 일할 계산 — 월세를 해당 월 일수로 나눠 사용 일수만큼 청구.
 * 정책: 월 기준 일할 (DAU × 일수). 부동산 관행상 한 달은 30/31/28일 그대로.
 * ========================================================================= */

/**
 * 월세를 일할 계산.
 *
 * @param monthlyRent 월세(원)
 * @param targetMonth 대상 월의 임의 날짜
 * @param fromDate    청구 시작일 (inclusive)
 * @param toDate      청구 종료일 (inclusive, 같은 월이어야 함)
 * @returns 일할 금액(원, 정수)
 *
 * @throws fromDate/toDate가 targetMonth와 다른 월이면 에러.
 */
export function prorateRent(
  monthlyRent: number,
  targetMonth: Date,
  fromDate: Date,
  toDate: Date,
): number {
  asWon(monthlyRent);
  if (toDate < fromDate) {
    throw new Error("prorateRent: toDate 가 fromDate 보다 빠릅니다.");
  }
  const tMonth = targetMonth.getMonth();
  const tYear = targetMonth.getFullYear();
  if (
    fromDate.getMonth() !== tMonth || fromDate.getFullYear() !== tYear
    || toDate.getMonth() !== tMonth || toDate.getFullYear() !== tYear
  ) {
    throw new Error("prorateRent: from/to 는 targetMonth 와 같은 월이어야 합니다.");
  }
  const daysInMonth = getDaysInMonth(targetMonth);
  const usedDays = differenceInCalendarDays(toDate, fromDate) + 1; // inclusive
  if (usedDays >= daysInMonth) return monthlyRent;
  // 일액 × 사용일. 일액 = 월세 / 일수 (소수 가능). 최종은 floor.
  return Math.floor((monthlyRent * usedDays) / daysInMonth);
}

/* =========================================================================
 * 연체 이자 — 연이율 % 기준, 일할 단리.
 * 정책: 기본 12%/년. lease 별 override 가능.
 * 계산식: principal × (annualRate/100) × (overdueDays / 365), floor.
 * ========================================================================= */

export function overdueInterest(
  principal: number,
  overdueDays: number,
  annualRatePercent: number,
): number {
  asWon(principal);
  if (overdueDays <= 0) return 0;
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new Error(`overdueInterest: 잘못된 연이율 ${annualRatePercent}`);
  }
  return Math.floor((principal * annualRatePercent * overdueDays) / (100 * 365));
}

/* =========================================================================
 * 수수료 (위탁수수료) — percent | fixed 두 모드.
 * ========================================================================= */

export type FeeType = "percent" | "fixed";

export interface CommissionInput {
  fee_type: FeeType;
  fee_percent?: number | null;
  fee_fixed?: number | null;
  /** percent 적용 대상 (보통 paid_rent_total). */
  base_amount: number;
}

export function computeCommission(input: CommissionInput): number {
  if (input.fee_type === "percent") {
    if (input.fee_percent == null) {
      throw new Error("computeCommission: percent 모드에 fee_percent 누락");
    }
    return applyPercent(input.base_amount, input.fee_percent);
  }
  if (input.fee_type === "fixed") {
    if (input.fee_fixed == null) {
      throw new Error("computeCommission: fixed 모드에 fee_fixed 누락");
    }
    return asWon(input.fee_fixed);
  }
  throw new Error(`computeCommission: 알 수 없는 fee_type ${input.fee_type}`);
}
