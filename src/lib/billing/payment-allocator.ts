/**
 * 입금 매칭 / 충당 로직 (순수 함수).
 *
 * 단일 invoice 에 대한 부분/초과납 처리.
 * 초과액은 호출부에서 다음 invoice 로 자동 충당 결정.
 */

import { asWon } from "@/lib/money";
import type { InvoiceStatus } from "@/types/lease";

export interface ApplyPaymentInput {
  amount_total: number;
  paid_total: number;
  payment_amount: number;
}

export interface ApplyPaymentResult {
  new_paid_total: number;
  new_status: InvoiceStatus;
  overflow: number;          // 초과액 (다음 invoice 로 이월 대상)
}

/**
 * 단일 invoice 에 입금 적용.
 * - new_paid_total = min(paid_total + payment_amount, amount_total)
 * - overflow = (paid_total + payment_amount) - amount_total (음수 X)
 * - status: paid_total==0 & 입금<total ⇒ partial / >=total ⇒ paid / 그 외 partial 유지.
 */
export function applyPaymentToInvoice(input: ApplyPaymentInput): ApplyPaymentResult {
  asWon(input.amount_total);
  asWon(input.paid_total);
  asWon(input.payment_amount);
  if (input.payment_amount <= 0) {
    throw new Error("applyPaymentToInvoice: payment_amount > 0");
  }

  const projected = input.paid_total + input.payment_amount;
  const new_paid_total = Math.min(projected, input.amount_total);
  const overflow = Math.max(0, projected - input.amount_total);

  let new_status: InvoiceStatus;
  if (new_paid_total >= input.amount_total) {
    new_status = "paid";
  } else {
    new_status = "partial";
  }

  return { new_paid_total, new_status, overflow };
}
