import { describe, expect, it } from "vitest";
import {
  classifyAuctionCase,
  classifyCreditor,
  countByCreditorType,
  filterTargetOnly,
  normalizeAuctionAddress,
  parseAuctionPasteText,
  type ParsedAuctionCase,
} from "./court-auction";

function block(partyLine: string, caseNumber = "2026-50501"): string {
  return [
    "서부6계",
    caseNumber,
    "[강제경매] 다세대",
    "서울 은평구 갈현동 521-22 하나빌라 202호",
    partyLine,
    "296,000,000",
    "220,000,000",
    "2026.04.30",
  ].join("\n");
}

describe("parseAuctionPasteText party fields", () => {
  it.each([
    ["신청자 : 주택도시보증공사", "주택도시보증공사"],
    ["신청채권자：서울보증보험", "서울보증보험"],
    ["경매신청자﹕ HUG", "HUG"],
    ["신청자 SGI서울보증", "SGI서울보증"],
  ])("parses applicant label and colon variants: %s", (partyLine, expected) => {
    const [parsed] = parseAuctionPasteText(block(partyLine));

    expect(parsed.applicant).toBe(expected);
    expect(parsed.creditor).toBeUndefined();
  });

  it("parses fields in arbitrary order with ASCII and full-width pipes", () => {
    const [parsed] = parseAuctionPasteText(
      block(
        "소유자：홍길동 ｜ 신청채권자: 서울보증보험 | 채무자 : 김채무 | 채권자 : 국민은행",
      ),
    );

    expect(parsed).toMatchObject({
      ownerName: "홍길동",
      applicant: "서울보증보험",
      creditor: "국민은행",
    });
  });

  it("parses adjacent labeled fields even when pipes are omitted", () => {
    const [parsed] = parseAuctionPasteText(
      block("신청자 : 주택도시보증공사 소유자 : 홍길동 채권자 : 시중은행"),
    );

    expect(parsed).toMatchObject({
      applicant: "주택도시보증공사",
      ownerName: "홍길동",
      creditor: "시중은행",
    });
  });

  it("keeps missing applicant and non-target parties as OTHER", () => {
    const [parsed] = parseAuctionPasteText(
      block("채권자 : 국민은행 | 채무자 : 김채무 | 소유자 : 홍길동"),
    );

    expect(parsed.applicant).toBeUndefined();
    expect(classifyAuctionCase(parsed)).toBe("OTHER");
  });

  it("does not copy a labeled applicant into the legacy creditor field", () => {
    const [parsed] = parseAuctionPasteText(
      block("경매신청자 : 주택도시보증공사 | 소유자 : 홍길동"),
    );

    expect(parsed.applicant).toBe("주택도시보증공사");
    expect(parsed.creditor).toBeUndefined();
  });

  it("preserves legacy unlabeled guarantor fallback", () => {
    const [parsed] = parseAuctionPasteText(block("주택도시보증공사"));

    expect(parsed.creditor).toBe("주택도시보증공사");
    expect(parsed.applicant).toBeUndefined();
  });
});

describe("auction case target classification", () => {
  it("keeps legacy creditor-only classification behavior", () => {
    expect(classifyCreditor("주택도시보증공사")).toBe("HUG");
    expect(classifyCreditor("서울보증보험")).toBe("SGI");
    expect(classifyCreditor("국민은행")).toBe("OTHER");
  });

  it.each([
    [{ creditor: "국민은행", applicant: "주택도시보증공사" }, "HUG"],
    [{ creditor: "국민은행", applicant: "서울보증보험" }, "SGI"],
    [{ creditor: "주택도시보증공사" }, "HUG"],
    [{ applicant: "서울보증보험" }, "SGI"],
    [{ creditor: "국민은행", applicant: "개인 홍길동" }, "OTHER"],
  ] as const)("classifies either creditor or applicant: %o", (parties, expected) => {
    expect(classifyAuctionCase(parties)).toBe(expected);
  });

  it("gives HUG explicit priority when HUG and SGI are mixed", () => {
    expect(
      classifyAuctionCase({
        creditor: "서울보증보험",
        applicant: "주택도시보증공사",
      }),
    ).toBe("HUG");
    expect(
      classifyAuctionCase({
        creditor: "주택도시보증공사",
        applicant: "서울보증보험",
      }),
    ).toBe("HUG");
  });

  it("filters and counts using both creditor and applicant", () => {
    const cases: ParsedAuctionCase[] = [
      { caseNumber: "1", address: "A", creditor: "국민은행", applicant: "HUG" },
      { caseNumber: "2", address: "B", creditor: "서울보증보험" },
      { caseNumber: "3", address: "C", applicant: "개인 홍길동" },
      { caseNumber: "4", address: "D", creditor: "SGI", applicant: "주택도시보증공사" },
    ];

    expect(countByCreditorType(cases)).toEqual({ HUG: 2, SGI: 1, OTHER: 1 });
    expect(filterTargetOnly(cases).map((item) => item.caseNumber)).toEqual(["1", "2", "4"]);
  });
});

describe("auction value normalization", () => {
  it("zero-pads dates without reordering the source fields", () => {
    const [parsed] = parseAuctionPasteText(
      block("채권자: HUG | 소유자: 홍길동")
        .replace("2026.04.30", "2026.4.3")
        .concat("\n2026.10.1"),
    );

    expect(parsed.auctionDate).toBe("2026-04-03");
    expect(parsed.dividendDeadline).toBe("2026-10-01");
  });

  it("uses explicit amount and date labels before fallback inference", () => {
    const [parsed] = parseAuctionPasteText([
      "서부6계",
      "2026-50502",
      "서울 은평구 가상동 1-1 301호",
      "채권자: HUG | 소유자: 홍길동",
      "채권액 900,000,000",
      "최저매각가격: 210,000,000",
      "감정평가액: 300,000,000",
      "배당요구종기일: 2026.4.30",
      "매각기일: 2026.7.20",
    ].join("\n"));

    expect(parsed.appraisalValue).toBe(300_000_000);
    expect(parsed.minimumBid).toBe(210_000_000);
    expect(parsed.auctionDate).toBe("2026-07-20");
    expect(parsed.dividendDeadline).toBe("2026-04-30");
  });

  it("normalizes address punctuation and spacing for composite dedup keys", () => {
    expect(normalizeAuctionAddress("서울 은평구 가상로 1-2, 301호"))
      .toBe(normalizeAuctionAddress("서울은평구 가상로 1-2 301호"));
  });
});
