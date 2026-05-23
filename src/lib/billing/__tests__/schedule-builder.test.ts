import { describe, expect, it } from "vitest";
import { buildSchedules } from "@/lib/billing/schedule-builder";

describe("schedule-builder: long_term monthly", () => {
  it("2026-05-01 ~ 2027-04-30, rent_day=25, 월세 50만, mgmt 7만, no VAT", () => {
    const rows = buildSchedules({
      id: "lease-1",
      lease_type: "long_term",
      start_date: "2026-05-01",
      end_date: "2027-04-30",
      rent_amount: 500_000,
      rent_cycle: "monthly",
      rent_day: 25,
      management_fee: 70_000,
      vat_included: false,
    });
    // 12개월, 첫 청구 5/25 ~ 마지막 4/25
    expect(rows.length).toBe(12);
    expect(rows[0].due_date).toBe("2026-05-25");
    expect(rows[11].due_date).toBe("2027-04-25");
    rows.forEach((r) => {
      expect(r.amount_rent).toBe(500_000);
      expect(r.amount_management).toBe(70_000);
      expect(r.amount_vat).toBe(0);
      expect(r.amount_total).toBe(570_000);
      expect(r.prorated).toBe(false);
    });
  });

  it("일할 — 5/15 시작, rent_day=25", () => {
    // 5/25 첫 청구지만 계약 시작이 5/15 라 일할이 적용되지 않음 (5/15~5/31 까지 일할되어야 하는 정책).
    // 현 구현: 시작일이 dueMonthRange.start 이후면 [start..month_end] 일할.
    const rows = buildSchedules({
      id: "lease-2",
      lease_type: "long_term",
      start_date: "2026-05-15",
      end_date: "2027-05-14",
      rent_amount: 500_000,
      rent_cycle: "monthly",
      rent_day: 25,
      management_fee: 0,
      vat_included: false,
    });
    // 첫 청구 = 5/15~5/31 일할
    const expectedFirst = Math.floor((500_000 * 17) / 31);
    expect(rows[0].due_date).toBe("2026-05-25");
    expect(rows[0].amount_rent).toBe(expectedFirst);
    expect(rows[0].prorated).toBe(true);
  });

  it("VAT 포함 시 amount_vat 분리, total = rent+mgmt+vat", () => {
    const rows = buildSchedules({
      id: "lease-3",
      lease_type: "long_term",
      start_date: "2026-05-01",
      end_date: "2026-06-30",
      rent_amount: 500_000,
      rent_cycle: "monthly",
      rent_day: 25,
      management_fee: 70_000,
      vat_included: true,
    });
    expect(rows[0].amount_rent).toBe(500_000);
    expect(rows[0].amount_management).toBe(70_000);
    expect(rows[0].amount_vat).toBe(57_000); // (500000+70000) × 10%
    expect(rows[0].amount_total).toBe(627_000);
  });

  it("rent_day=31, 2월 → 말일(2/28) 보정", () => {
    const rows = buildSchedules({
      id: "lease-4",
      lease_type: "long_term",
      start_date: "2026-01-01",
      end_date: "2026-04-30",
      rent_amount: 300_000,
      rent_cycle: "monthly",
      rent_day: 31,
      management_fee: 0,
      vat_included: false,
    });
    const dates = rows.map((r) => r.due_date);
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
});

describe("schedule-builder: short_term weekly/daily", () => {
  it("weekly — 8주", () => {
    const rows = buildSchedules({
      id: "lease-5",
      lease_type: "short_term",
      start_date: "2026-05-01",
      end_date: "2026-06-25", // 8주 (56일)
      rent_amount: 100_000,
      rent_cycle: "weekly",
      rent_day: null,
      management_fee: 0,
      vat_included: false,
    });
    expect(rows.length).toBeGreaterThanOrEqual(7);
    expect(rows[0].due_date).toBe("2026-05-01");
    expect(rows.every((r) => r.amount_rent === 100_000)).toBe(true);
    expect(rows.every((r) => r.prorated === false)).toBe(true);
  });

  it("daily — 7일", () => {
    const rows = buildSchedules({
      id: "lease-6",
      lease_type: "short_term",
      start_date: "2026-05-01",
      end_date: "2026-05-07",
      rent_amount: 50_000,
      rent_cycle: "daily",
      rent_day: null,
      management_fee: 0,
      vat_included: false,
    });
    expect(rows.length).toBe(7);
    expect(rows[0].due_date).toBe("2026-05-01");
    expect(rows[6].due_date).toBe("2026-05-07");
  });
});
