import { describe, expect, it } from "vitest";
import { parseLedger, toNumber } from "./ledger-parser";
import type { Cell } from "./all-parser";

const row = (...vals: string[]): Cell[] => vals.map((v) => ({ v, bg: null }));

describe("parseLedger", () => {
  const grid: Cell[][] = [
    row("가임대인 정산현황", "가임대인", "입금총계", "=1,800,000"),
    row("26.08.31현재", "", "임대인이익금", "500000", "=?", "1000000"),
    row("날짜", "소유주", "건물명", "호수", "계정", "내용", "수입", "지출", "잔액", "임차인"),
    row("2026.07.01", "가임대인", "가빌", "101", "보증금", "계약금", "1,000,000", "", "=1000000", "홍길동"),
    row("2026-07-05", "가임대인", "가빌", "101", "임대료", "7월", "800000", "-", "", "홍길동"),
    row("2026.07.10", "", "가빌", "101", "중개보수료", "", "", "300000"),
    row("2026.08.05", "", "", "임대인이익금", "", "", "", "500000"),
    row("", "", "", "", "", "합계", "1800000", "800000"),
  ];
  const L = parseLedger(grid, "가장부", "가임대인", "5:5");

  it("요약 블록과 기준일", () => {
    expect(L.asOfText).toBe("26.08.31현재");
    expect(L.summary).toEqual([{ label: "입금총계", value: 1_800_000 }, { label: "임대인이익금", value: 500_000 }]);
  });

  it("거래 분류: 보증금·수입·지출·임대인 지급, 합계 줄 제외", () => {
    expect(L.entries.map((e) => e.kind)).toEqual(["deposit_in", "income", "expense", "payout"]);
    const jul = L.months.find((m) => m.ym === "2026-07")!;
    expect(jul).toMatchObject({ income: 800_000, expense: 300_000, depositIn: 1_000_000 });
    expect(L.months.find((m) => m.ym === "2026-08")!.payout).toBe(500_000);
  });

  it("숫자 파싱", () => {
    expect(toNumber("=1,400,000")).toBe(1_400_000);
    expect(toNumber("-300,000")).toBe(-300_000);
    expect(toNumber("-")).toBe(0);
  });
});
