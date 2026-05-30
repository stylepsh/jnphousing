import { describe, it, expect } from "vitest";
import {
  toIsoDate,
  fromIsoDate,
  resolveDueDate,
  generateDueDates,
  leaseRangeFromMonths,
  isExpiringSoon,
  previousBusinessDay,
  nextBusinessDay,
} from "@/lib/dates";

describe("toIsoDate / fromIsoDate", () => {
  it("라운드트립 유지", () => {
    expect(toIsoDate(fromIsoDate("2026-05-30"))).toBe("2026-05-30");
  });
});

describe("resolveDueDate (청구일 말일 보정)", () => {
  it("일반 날짜는 그대로", () => {
    expect(toIsoDate(resolveDueDate(2026, 4, 10))).toBe("2026-05-10");
  });
  it("2월 31일 요청 → 말일(28)로 보정", () => {
    expect(toIsoDate(resolveDueDate(2026, 1, 31))).toBe("2026-02-28");
  });
  it("윤년 2월 31일 → 29일", () => {
    expect(toIsoDate(resolveDueDate(2028, 1, 31))).toBe("2028-02-29");
  });
  it("범위 밖 rent_day 는 throw", () => {
    expect(() => resolveDueDate(2026, 0, 0)).toThrow();
    expect(() => resolveDueDate(2026, 0, 32)).toThrow();
  });
});

describe("leaseRangeFromMonths", () => {
  it("12개월 → 시작 + 12개월 - 1일", () => {
    const r = leaseRangeFromMonths(fromIsoDate("2026-01-01"), 12);
    expect(toIsoDate(r.start)).toBe("2026-01-01");
    expect(toIsoDate(r.end)).toBe("2026-12-31");
  });
  it("음수/0 개월은 throw", () => {
    expect(() => leaseRangeFromMonths(new Date(), 0)).toThrow();
    expect(() => leaseRangeFromMonths(new Date(), -1)).toThrow();
  });
});

describe("generateDueDates", () => {
  it("monthly: 매월 rent_day, 첫 달이 시작 이전이면 다음 달부터", () => {
    const range = { start: fromIsoDate("2026-01-15"), end: fromIsoDate("2026-12-31") };
    const dates = generateDueDates(range, "monthly", 1).map(toIsoDate);
    expect(dates[0]).toBe("2026-02-01"); // 1/1 은 시작 이전 → 2/1 부터
    expect(dates).toHaveLength(11);
    expect(dates.at(-1)).toBe("2026-12-01");
  });

  it("monthly: 시작일과 청구일이 같으면 그 달 포함", () => {
    const range = { start: fromIsoDate("2026-01-01"), end: fromIsoDate("2026-12-31") };
    const dates = generateDueDates(range, "monthly", 1).map(toIsoDate);
    expect(dates).toHaveLength(12);
    expect(dates[0]).toBe("2026-01-01");
  });

  it("monthly: rent_day 없으면 throw", () => {
    const range = { start: fromIsoDate("2026-01-01"), end: fromIsoDate("2026-03-01") };
    expect(() => generateDueDates(range, "monthly", null)).toThrow();
  });

  it("weekly: 시작일부터 7일 간격", () => {
    const range = { start: fromIsoDate("2026-01-01"), end: fromIsoDate("2026-01-31") };
    const dates = generateDueDates(range, "weekly", null).map(toIsoDate);
    expect(dates).toEqual(["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22", "2026-01-29"]);
  });

  it("daily: 매일", () => {
    const range = { start: fromIsoDate("2026-01-01"), end: fromIsoDate("2026-01-05") };
    expect(generateDueDates(range, "daily", null)).toHaveLength(5);
  });
});

describe("isExpiringSoon", () => {
  const now = fromIsoDate("2026-05-30");
  it("기준일 이내면 true", () => {
    expect(isExpiringSoon(fromIsoDate("2026-06-20"), 30, now)).toBe(true);
  });
  it("기준일 초과면 false", () => {
    expect(isExpiringSoon(fromIsoDate("2026-08-01"), 30, now)).toBe(false);
  });
  it("이미 지난 날짜는 false", () => {
    expect(isExpiringSoon(fromIsoDate("2026-05-01"), 30, now)).toBe(false);
  });
});

describe("영업일 보정 (주말 스킵)", () => {
  it("previousBusinessDay: 토요일 → 금요일", () => {
    expect(toIsoDate(previousBusinessDay(fromIsoDate("2026-05-30")))).toBe("2026-05-29"); // 5/30=토 → 5/29 금
  });
  it("nextBusinessDay: 일요일 → 월요일", () => {
    expect(toIsoDate(nextBusinessDay(fromIsoDate("2026-05-31")))).toBe("2026-06-01"); // 5/31=일 → 6/1 월
  });
  it("평일은 그대로", () => {
    expect(toIsoDate(previousBusinessDay(fromIsoDate("2026-05-28")))).toBe("2026-05-28"); // 목
  });
});
