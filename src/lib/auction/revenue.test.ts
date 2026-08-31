import { describe, it, expect } from "vitest";
import {
  calcRecovery,
  monthlyFeeOf,
  estimateCumulativeIncome,
  daysUntil,
  leaseAlertOf,
  periodOf,
  dueDateOf,
  overdueDays,
} from "./revenue";

// 예시 물건: 현장팀 투입 180만, 월세 60만, 관리수수료율 40% → 월 24만
const COST = 1_800_000;
const MONTHLY_FEE = 240_000;

describe("calcRecovery — 투입비 회수 후 배분", () => {
  it("회수 전에는 배분이 0", () => {
    const r = calcRecovery({
      fieldTeamCost: COST,
      cumulativeIncome: MONTHLY_FEE * 3, // 3개월차 72만
      monthlyFee: MONTHLY_FEE,
      shareRate: 40,
    });
    expect(r.recovered).toBe(720_000);
    expect(r.remaining).toBe(1_080_000);
    expect(r.recoveryRate).toBe(40);
    expect(r.recoveredDone).toBe(false);
    expect(r.distributable).toBe(0);
    expect(r.fieldTeamShare).toBe(0);
    expect(r.companyShare).toBe(0);
    expect(r.monthsToRecover).toBe(5); // 108만 / 24만 = 4.5 → 5개월
  });

  it("회수가 끝나면 초과분만 배분", () => {
    const r = calcRecovery({
      fieldTeamCost: COST,
      cumulativeIncome: MONTHLY_FEE * 10, // 240만
      monthlyFee: MONTHLY_FEE,
      shareRate: 40,
    });
    expect(r.recovered).toBe(COST);
    expect(r.remaining).toBe(0);
    expect(r.recoveredDone).toBe(true);
    expect(r.monthsToRecover).toBe(0);
    expect(r.distributable).toBe(600_000); // 240만 - 180만
    expect(r.fieldTeamShare).toBe(240_000); // 40%
    expect(r.companyShare).toBe(360_000); // 60%
  });

  it("배분율을 바꿔도 두 몫의 합은 배분대상과 같다", () => {
    for (const rate of [30, 40, 50]) {
      const r = calcRecovery({
        fieldTeamCost: COST,
        cumulativeIncome: 2_400_000,
        monthlyFee: MONTHLY_FEE,
        shareRate: rate,
      });
      expect(r.fieldTeamShare + r.companyShare).toBe(r.distributable);
    }
  });

  it("투입비가 0이면 처음부터 회수 완료", () => {
    const r = calcRecovery({
      fieldTeamCost: 0,
      cumulativeIncome: 100_000,
      monthlyFee: MONTHLY_FEE,
      shareRate: 50,
    });
    expect(r.recoveryRate).toBe(100);
    expect(r.recoveredDone).toBe(true);
    expect(r.distributable).toBe(100_000);
    expect(r.fieldTeamShare).toBe(50_000);
  });

  it("월수입이 0이면 회수 예상 개월은 알 수 없음", () => {
    const r = calcRecovery({
      fieldTeamCost: COST,
      cumulativeIncome: 0,
      monthlyFee: 0,
      shareRate: 40,
    });
    expect(r.monthsToRecover).toBeNull();
  });
});

describe("monthlyFeeOf", () => {
  it("월세 × 수수료율", () => {
    expect(monthlyFeeOf(600_000, 40)).toBe(240_000);
    expect(monthlyFeeOf(null, 40)).toBe(0);
    expect(monthlyFeeOf(600_000, null)).toBe(0);
  });
});

describe("estimateCumulativeIncome", () => {
  it("시작월 포함해 경과 개월만큼", () => {
    // 2026-06 시작, 기준 2026-08 → 6·7·8 = 3개월
    expect(estimateCumulativeIncome("2026-06-01", MONTHLY_FEE, new Date(2026, 7, 15))).toBe(720_000);
  });

  it("시작일이 없으면 0", () => {
    expect(estimateCumulativeIncome(null, MONTHLY_FEE)).toBe(0);
  });
});

describe("만기 알림", () => {
  const today = new Date(2026, 7, 31); // 2026-08-31

  it("남은 일수 계산", () => {
    expect(daysUntil("2026-09-30", today)).toBe(30);
    expect(daysUntil("2026-08-01", today)).toBe(-30);
    expect(daysUntil(null, today)).toBeNull();
  });

  it("30일 이내 / 60일 이내 / 지남", () => {
    expect(leaseAlertOf("2026-09-15", today)).toBe("d30");
    expect(leaseAlertOf("2026-10-20", today)).toBe("d60");
    expect(leaseAlertOf("2026-12-31", today)).toBe("none");
    expect(leaseAlertOf("2026-08-01", today)).toBe("expired");
    expect(leaseAlertOf(null, today)).toBe("none");
  });
});

describe("수금일·연체", () => {
  it("기간 문자열", () => {
    expect(periodOf(new Date(2026, 8, 3))).toBe("2026-09");
  });

  it("말일 보정 — 31일 지정인데 2월이면 말일로", () => {
    expect(dueDateOf("2026-02", 31)).toBe("2026-02-28");
    expect(dueDateOf("2026-09", 27)).toBe("2026-09-27");
    expect(dueDateOf("2026-09", null)).toBeNull();
  });

  it("입금됐으면 연체 아님", () => {
    expect(overdueDays("2026-08-01", 600_000, new Date(2026, 7, 31))).toBe(0);
  });

  it("미납이고 예정일이 지났으면 연체일수", () => {
    expect(overdueDays("2026-08-01", 0, new Date(2026, 7, 31))).toBe(30);
  });

  it("아직 예정일 전이면 연체 아님", () => {
    expect(overdueDays("2026-09-27", 0, new Date(2026, 7, 31))).toBe(0);
  });
});
