import { describe, expect, it } from "vitest";
import { computeOverdue, overdueNoticeStage } from "@/lib/billing/overdue-calc";

describe("overdue-calc", () => {
  it("paid 면 연체 아님", () => {
    const r = computeOverdue({
      due_date: "2026-05-01",
      amount_total: 570_000,
      paid_total: 570_000,
      status: "paid",
      annual_rate_percent: 12,
      now: new Date("2026-06-01"),
    });
    expect(r.is_overdue).toBe(false);
    expect(r.new_status).toBe("paid");
  });
  it("due_date 미도래 → 연체 아님", () => {
    const r = computeOverdue({
      due_date: "2026-06-15",
      amount_total: 570_000,
      paid_total: 0,
      status: "unpaid",
      annual_rate_percent: 12,
      now: new Date("2026-06-10"),
    });
    expect(r.is_overdue).toBe(false);
    expect(r.overdue_days).toBe(0);
  });
  it("30일 연체, 미납 100만, 연 12% → 이자 9863", () => {
    const r = computeOverdue({
      due_date: "2026-05-01",
      amount_total: 1_000_000,
      paid_total: 0,
      status: "unpaid",
      annual_rate_percent: 12,
      now: new Date("2026-05-31"),
    });
    expect(r.is_overdue).toBe(true);
    expect(r.overdue_days).toBe(30);
    expect(r.outstanding).toBe(1_000_000);
    expect(r.overdue_interest).toBe(9863);
    expect(r.new_status).toBe("overdue");
  });
  it("부분 납부 상태에서 연체", () => {
    const r = computeOverdue({
      due_date: "2026-05-01",
      amount_total: 1_000_000,
      paid_total: 400_000,
      status: "partial",
      annual_rate_percent: 12,
      now: new Date("2026-05-31"),
    });
    expect(r.is_overdue).toBe(true);
    expect(r.outstanding).toBe(600_000);
    // 600000 × 0.12 × 30 / 365 = 5917.8...
    expect(r.overdue_interest).toBe(5917);
  });
});

describe("overdueNoticeStage", () => {
  it("D+1/7/15/30", () => {
    expect(overdueNoticeStage(1)).toBe("d1");
    expect(overdueNoticeStage(7)).toBe("d7");
    expect(overdueNoticeStage(15)).toBe("d15");
    expect(overdueNoticeStage(30)).toBe("d30");
  });
  it("그 외 일자 → null", () => {
    expect(overdueNoticeStage(0)).toBeNull();
    expect(overdueNoticeStage(2)).toBeNull();
    expect(overdueNoticeStage(45)).toBeNull();
  });
});
