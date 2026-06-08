/**
 * 임대 정산 계산 (부동산위탁관리 settlement.ts 이식).
 * 임대인 최종 지급액 = 월세 - 수수료 - 작업비 - 세금.
 * 금액은 모두 원(정수) 기준.
 */

export interface SettlementInput {
  monthlyRent: number; // 월세(원)
  managementFeeRate: number; // 관리수수료율 %
  individualTaxRate: number; // 개인 세율 %
  totalWorkCost?: number; // 상품화 누적비용(원)
}

export interface SettlementResult {
  rent: number;
  fee: number;
  workCost: number;
  preTax: number;
  tax: number;
  payout: number; // 임대인 최종 지급액
}

export function calcSettlement(input: SettlementInput): SettlementResult {
  const rent = Math.max(0, Math.round(input.monthlyRent || 0));
  const fee = Math.round(rent * ((input.managementFeeRate || 0) / 100));
  const workCost = Math.max(0, Math.round(input.totalWorkCost || 0));
  const preTax = rent - fee - workCost;
  const tax = preTax > 0 ? Math.round(preTax * ((input.individualTaxRate || 0) / 100)) : 0;
  const payout = preTax - tax;
  return { rent, fee, workCost, preTax, tax, payout };
}
