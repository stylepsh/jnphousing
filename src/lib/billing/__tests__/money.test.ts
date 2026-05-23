import { describe, expect, it } from "vitest";
import {
  asWon,
  formatWon,
  formatWonMan,
  vatOf,
  splitVatInclusive,
  withVat,
  normalizePercent,
  applyPercent,
  prorateRent,
  overdueInterest,
  computeCommission,
} from "@/lib/money";

describe("money: integer 강제", () => {
  it("정수 통과", () => {
    expect(asWon(1000)).toBe(1000);
    expect(asWon(0)).toBe(0);
    expect(asWon(-500)).toBe(-500); // 음수도 통과 (정산서에서 필요)
  });
  it("소수는 throw", () => {
    expect(() => asWon(1000.5)).toThrow();
    expect(() => asWon(NaN)).toThrow();
    expect(() => asWon(Infinity)).toThrow();
  });
});

describe("money: 포맷팅", () => {
  it("formatWon", () => {
    expect(formatWon(0)).toBe("0");
    expect(formatWon(1234567)).toBe("1,234,567");
    expect(formatWon(-1234567)).toBe("△1,234,567");
  });
  it("formatWonMan", () => {
    expect(formatWonMan(0)).toBe("0");
    expect(formatWonMan(9999)).toBe("9,999");
    expect(formatWonMan(10000)).toBe("1만");
    expect(formatWonMan(12_345_000)).toBe("1,234만");
    expect(formatWonMan(100_000_000)).toBe("1억");
    expect(formatWonMan(123_456_789)).toBe("1억 2,345만");
  });
});

describe("money: 부가세 10%", () => {
  it("vatOf — floor", () => {
    expect(vatOf(100_000)).toBe(10_000);
    expect(vatOf(500_000)).toBe(50_000);
    expect(vatOf(123_457)).toBe(12_345); // floor(12345.7)
  });
  it("withVat", () => {
    expect(withVat(100_000)).toBe(110_000);
  });
  it("splitVatInclusive 합산 정합성", () => {
    const total = 1_100_000;
    const { supply, vat } = splitVatInclusive(total);
    expect(supply + vat).toBe(total);
    expect(supply).toBe(1_000_000);
    expect(vat).toBe(100_000);
  });
  it("splitVatInclusive — round-trip 안전 (소수 발생 케이스)", () => {
    // 1원 단위 차이가 vat 에 흡수되어야 함
    const total = 1_100_001;
    const { supply, vat } = splitVatInclusive(total);
    expect(supply + vat).toBe(total);
  });
});

describe("money: 비율", () => {
  it("normalizePercent — 소수 2자리", () => {
    expect(normalizePercent(10)).toBe("10.00");
    expect(normalizePercent(7.5)).toBe("7.50");
    expect(normalizePercent(12.345)).toBe("12.35"); // 반올림
  });
  it("normalizePercent — 범위 외 throw", () => {
    expect(() => normalizePercent(-1)).toThrow();
    expect(() => normalizePercent(1000)).toThrow();
  });
  it("applyPercent — floor", () => {
    expect(applyPercent(500_000, 10)).toBe(50_000);
    expect(applyPercent(500_000, 7.5)).toBe(37_500);
    expect(applyPercent(123_457, 10)).toBe(12_345); // floor(12345.7)
    expect(applyPercent(0, 10)).toBe(0);
  });
});

describe("money: 일할 계산", () => {
  it("월 중간부터 끝까지", () => {
    // 2026-05 (31일), 월세 50만, 5/15~5/31 = 17일
    const v = prorateRent(500_000, new Date("2026-05-01"), new Date("2026-05-15"), new Date("2026-05-31"));
    expect(v).toBe(Math.floor((500_000 * 17) / 31));
  });
  it("월 전체 사용 → 그대로 반환", () => {
    const v = prorateRent(500_000, new Date("2026-05-01"), new Date("2026-05-01"), new Date("2026-05-31"));
    expect(v).toBe(500_000);
  });
  it("2월 (28일)", () => {
    const v = prorateRent(280_000, new Date("2026-02-01"), new Date("2026-02-15"), new Date("2026-02-28"));
    expect(v).toBe(Math.floor((280_000 * 14) / 28));
    expect(v).toBe(140_000);
  });
  it("다른 월이면 throw", () => {
    expect(() =>
      prorateRent(500_000, new Date("2026-05-01"), new Date("2026-04-15"), new Date("2026-05-15")),
    ).toThrow();
  });
  it("to < from 이면 throw", () => {
    expect(() =>
      prorateRent(500_000, new Date("2026-05-01"), new Date("2026-05-20"), new Date("2026-05-15")),
    ).toThrow();
  });
});

describe("money: 연체 이자", () => {
  it("0일 → 0원", () => {
    expect(overdueInterest(1_000_000, 0, 12)).toBe(0);
  });
  it("연 12%, 30일, 100만 = 100만 × 12% × 30/365 = 9863", () => {
    // 100만 × 0.12 × 30/365 = 9863.013...
    expect(overdueInterest(1_000_000, 30, 12)).toBe(9863);
  });
  it("연이율 0% → 0원", () => {
    expect(overdueInterest(1_000_000, 100, 0)).toBe(0);
  });
});

describe("money: 위탁수수료 (percent | fixed)", () => {
  it("percent 10% × 50만 = 5만", () => {
    expect(computeCommission({
      fee_type: "percent",
      fee_percent: 10,
      base_amount: 500_000,
    })).toBe(50_000);
  });
  it("percent 7.5% × 50만 = 37500", () => {
    expect(computeCommission({
      fee_type: "percent",
      fee_percent: 7.5,
      base_amount: 500_000,
    })).toBe(37_500);
  });
  it("fixed 5만 (base 무관)", () => {
    expect(computeCommission({
      fee_type: "fixed",
      fee_fixed: 50_000,
      base_amount: 999_999,
    })).toBe(50_000);
  });
  it("percent 모드 + fee_percent 누락 → throw", () => {
    expect(() => computeCommission({
      fee_type: "percent",
      fee_percent: null,
      base_amount: 500_000,
    })).toThrow();
  });
  it("fixed 모드 + fee_fixed 누락 → throw", () => {
    expect(() => computeCommission({
      fee_type: "fixed",
      fee_fixed: null,
      base_amount: 500_000,
    })).toThrow();
  });
});
