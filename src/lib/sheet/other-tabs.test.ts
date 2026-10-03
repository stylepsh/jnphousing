import { describe, expect, it } from "vitest";
import { parseMoveOuts, parseReports } from "./other-tabs";
import type { Cell } from "./all-parser";

const row = (...vals: string[]): Cell[] => vals.map((v) => ({ v, bg: null }));

describe("parseMoveOuts", () => {
  it("블록 단위로 물건·기간·항목·환급액을 읽고 미정산을 표시한다", () => {
    const [m, n] = parseMoveOuts([
      row("퇴실정산", "퇴실정산"),
      row("물건", "가빌 401호", "", "(100/70/10)"),
      row("임차인", "홍길동"),
      row("기간", "25.07.10", "26.01.09", "6개월"),
      row("사유", "만기퇴실"),
      row("구분", "수입", "사용료 공제", "환급액", "비고"),
      row("보증금", "1000000", "", "=1000000"),
      row("전기료 정산", "", "", "-33160", "본인정산"),
      row("계", "=1000000", "0", "=966840"),
      row("퇴실정산"),
      row("물건", "가임대인", "306", "100/80/10"),
      row("구분", "수입", "사용료 공제", "환급액"),
      row("보증금", "1000000"),
      row("계", "1000000", "0", "=?", "*미정산"),
    ]);
    expect(m).toMatchObject({ property: "가빌 401호", terms: "(100/70/10)", tenant: "홍길동", period: "25.07.10 ~ 26.01.09 · 6개월", refund: 966_840, pending: false });
    expect(m.lines.map((l) => l.item)).toEqual(["보증금", "전기료 정산"]);
    expect(n).toMatchObject({ property: "가임대인 306호", terms: "100/80/10", pending: true });
  });
});

describe("parseReports", () => {
  it("병합된 그룹 헤더를 이어 붙이고 계 줄에서 멈춘다", () => {
    const [b] = parseReports([
      row("26년 7월 단기임대 수익현황"),
      row("", "", "", "2026년7월31일 기준"),
      row("no.", "구분", "보증금 예치", "DM 수익", "", "임대인 수익"),
      row("", "", "", "6월 수익", "누계", "금월 지급액"),
      row("1", "가임대인", "8,000,000", "5,803,750", "93,325,310", "7,201,570"),
      row("", "계", "8,000,000", "5,803,750", "93,325,310", "7,201,570"),
    ]);
    expect(b.ym).toBe("2026-07");
    expect(b.basis).toBe("2026년7월31일 기준");
    expect(b.columns).toEqual(["보증금 예치", "DM 수익 · 6월 수익", "DM 수익 · 누계", "임대인 수익 · 금월 지급액"]);
    expect(b.rows).toEqual([{ name: "가임대인", cells: ["8,000,000", "5,803,750", "93,325,310", "7,201,570"] }]);
    expect(b.total).not.toBeNull();
  });
});
