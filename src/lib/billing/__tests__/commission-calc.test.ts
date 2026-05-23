import { describe, expect, it } from "vitest";
import { computeMonthCommission } from "@/lib/billing/commission-calc";

describe("commission-calc", () => {
  it("percent 10%, paid 50만 → 5만", () => {
    const r = computeMonthCommission({
      fee_type: "percent",
      fee_percent: 10,
      fee_fixed: null,
      paid_rent_total: 500_000,
    });
    expect(r.base_amount).toBe(500_000);
    expect(r.commission_amount).toBe(50_000);
  });
  it("percent — 미수금이면 0", () => {
    const r = computeMonthCommission({
      fee_type: "percent",
      fee_percent: 10,
      fee_fixed: null,
      paid_rent_total: 0,
    });
    expect(r.commission_amount).toBe(0);
  });
  it("fixed 5만 + paid > 0 → 5만", () => {
    const r = computeMonthCommission({
      fee_type: "fixed",
      fee_percent: null,
      fee_fixed: 50_000,
      paid_rent_total: 500_000,
    });
    expect(r.commission_amount).toBe(50_000);
    expect(r.base_amount).toBe(0); // 정액은 base 무관
  });
  it("fixed 5만 + paid 0 → 0", () => {
    const r = computeMonthCommission({
      fee_type: "fixed",
      fee_percent: null,
      fee_fixed: 50_000,
      paid_rent_total: 0,
    });
    expect(r.commission_amount).toBe(0);
  });
  it("fixed 5만 + fixed_count=3 → 15만", () => {
    const r = computeMonthCommission({
      fee_type: "fixed",
      fee_percent: null,
      fee_fixed: 50_000,
      paid_rent_total: 1_500_000,
      fixed_count: 3,
    });
    expect(r.commission_amount).toBe(150_000);
  });
});
