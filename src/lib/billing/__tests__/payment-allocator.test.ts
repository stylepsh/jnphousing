import { describe, expect, it } from "vitest";
import { applyPaymentToInvoice } from "@/lib/billing/payment-allocator";

describe("payment-allocator", () => {
  it("정확히 납부 → paid, overflow 0", () => {
    const r = applyPaymentToInvoice({ amount_total: 570_000, paid_total: 0, payment_amount: 570_000 });
    expect(r.new_status).toBe("paid");
    expect(r.new_paid_total).toBe(570_000);
    expect(r.overflow).toBe(0);
  });
  it("부분 납부 → partial", () => {
    const r = applyPaymentToInvoice({ amount_total: 570_000, paid_total: 0, payment_amount: 300_000 });
    expect(r.new_status).toBe("partial");
    expect(r.new_paid_total).toBe(300_000);
    expect(r.overflow).toBe(0);
  });
  it("초과 납부 → paid + overflow", () => {
    const r = applyPaymentToInvoice({ amount_total: 570_000, paid_total: 0, payment_amount: 700_000 });
    expect(r.new_status).toBe("paid");
    expect(r.new_paid_total).toBe(570_000);
    expect(r.overflow).toBe(130_000);
  });
  it("기존 partial 에 추가 납부로 완납", () => {
    const r = applyPaymentToInvoice({ amount_total: 570_000, paid_total: 200_000, payment_amount: 370_000 });
    expect(r.new_status).toBe("paid");
    expect(r.new_paid_total).toBe(570_000);
    expect(r.overflow).toBe(0);
  });
  it("payment_amount <= 0 → throw", () => {
    expect(() => applyPaymentToInvoice({ amount_total: 100_000, paid_total: 0, payment_amount: 0 })).toThrow();
    expect(() => applyPaymentToInvoice({ amount_total: 100_000, paid_total: 0, payment_amount: -1 })).toThrow();
  });
});
