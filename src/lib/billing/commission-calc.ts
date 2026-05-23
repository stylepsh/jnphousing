/**
 * 위탁수수료 계산 (순수 함수).
 *
 * 정책:
 * - 수금주의(cash basis): 실제 입금된 금액에 한해 수수료 발생.
 * - percent: paid_rent_total × fee_percent / 100, floor.
 * - fixed: 정액. 단 paid 가 0 이면 발생 X (옵션). 기본은 paid > 0 이면 정액 1회.
 *   ↳ 박성혁님 정책: "납부 1회당" — 한 invoice 단위로 1건 발생.
 */

import { asWon, computeCommission, type FeeType } from "@/lib/money";

export interface MonthCommissionInput {
  fee_type: FeeType;
  fee_percent: number | null;
  fee_fixed: number | null;
  /** 해당 기간 동안 paid 된 rent 합계 (관리비/부가세 제외). */
  paid_rent_total: number;
  /** fixed 모드에서 발생 단위 — 기본 1. paid invoice 수로 카운트하려면 호출부에서 결정. */
  fixed_count?: number;
}

export interface MonthCommissionResult {
  base_amount: number;       // percent 기준은 paid_rent_total, fixed 기준은 0
  commission_amount: number;
}

export function computeMonthCommission(input: MonthCommissionInput): MonthCommissionResult {
  asWon(input.paid_rent_total);

  if (input.fee_type === "percent") {
    const amount = computeCommission({
      fee_type: "percent",
      fee_percent: input.fee_percent,
      base_amount: input.paid_rent_total,
    });
    return { base_amount: input.paid_rent_total, commission_amount: amount };
  }

  if (input.fee_type === "fixed") {
    const count = input.fixed_count ?? (input.paid_rent_total > 0 ? 1 : 0);
    if (count === 0) return { base_amount: 0, commission_amount: 0 };
    const per = computeCommission({
      fee_type: "fixed",
      fee_fixed: input.fee_fixed,
      base_amount: 0,
    });
    return { base_amount: 0, commission_amount: per * count };
  }

  throw new Error(`computeMonthCommission: 알 수 없는 fee_type ${input.fee_type}`);
}
