import { describe, it, expect } from "vitest";
import {
  parseContracts, parseMonthly, summarize, contractStatus, detectIssues,
  calcSettlement, toWon, toIsoDate, type RentalContract,
} from "./rental-workbook";

// 10_계약통합 시트의 한 행: [부동산, 사건번호, 주소, 소유주, 임차인, 계약조건,
//                            보증금, 월세, 계약시작, 계약종료, 납부일, 계약일, 비고]
const row = (over: Partial<Record<number, unknown>> = {}) => {
  const r: unknown[] = [
    "미래부동산", "2026타경1234", "인천 남동구 예시로 1", "김소유", "홍길동", "월세",
    10_000_000, 600_000, "2026-01-01", "2026-12-31", 25, "2025-12-20", "",
  ];
  Object.entries(over).forEach(([k, v]) => { r[Number(k)] = v; });
  return r;
};

const base: RentalContract = {
  agency: "미래부동산", caseNumber: "2026타경1234", address: "인천 남동구 예시로 1",
  owner: "김소유", tenant: "홍길동", deposit: 10_000_000, monthlyRent: 600_000,
  leaseStart: "2026-01-01", leaseEnd: "2026-12-31", dueDay: 25,
};

describe("셀 값 해석", () => {
  it("금액에 콤마·원 표기가 섞여도 숫자로 읽는다", () => {
    expect(toWon("1,200,000원")).toBe(1_200_000);
    expect(toWon({ result: 500000 })).toBe(500_000);   // 수식 셀
    expect(toWon("")).toBe(0);
  });
  it("날짜는 형식이 달라도 YYYY-MM-DD 로 맞춘다", () => {
    expect(toIsoDate("2026/3/5")).toBe("2026-03-05");
    expect(toIsoDate(new Date(Date.UTC(2026, 7, 1)))).toBe("2026-08-01");
    expect(toIsoDate("")).toBeNull();
  });
});

describe("parseContracts", () => {
  it("정상 행을 읽는다", () => {
    const { contracts } = parseContracts([row()]);
    expect(contracts[0]).toMatchObject({
      agency: "미래부동산", monthlyRent: 600_000, deposit: 10_000_000, dueDay: 25,
    });
  });
  it("주소가 없는 행은 건너뛴다", () => {
    expect(parseContracts([row({ 2: "" })]).contracts).toHaveLength(0);
  });
  it("납부일이 1~31 밖이면 null 로 둔다", () => {
    expect(parseContracts([row({ 10: 45 })]).contracts[0].dueDay).toBeNull();
  });
});

describe("parseMonthly", () => {
  it("청구/입금 3칸 반복 헤더를 읽어 월별로 합산한다", () => {
    const header = ["주소", "임차인", "부동산", "월세", "납부일", "계약시작", "계약종료",
      "2026-08 청구", "2026-08 입금", "2026-08 미납",
      "2026-09 청구", "2026-09 입금", "2026-09 미납"];
    const rows = [
      ["A", "", "", "", "", "", "", 600_000, 600_000, 0, 600_000, 0, 600_000],
      ["B", "", "", "", "", "", "", 500_000, 200_000, 300_000, 500_000, 500_000, 0],
    ];
    expect(parseMonthly(header, rows)).toEqual([
      { period: "2026-08", charged: 1_100_000, paid: 800_000, unpaid: 300_000 },
      { period: "2026-09", charged: 1_100_000, paid: 500_000, unpaid: 600_000 },
    ]);
  });
});

describe("contractStatus — 계약이 끝나면 공실", () => {
  const today = new Date("2026-09-02T00:00:00Z");
  it("기간 안이면 임대중", () => {
    expect(contractStatus(base, today).status).toBe("임대중");
  });
  it("만료일이 지나면 공실로 본다", () => {
    const r = contractStatus({ ...base, leaseEnd: "2026-08-31" }, today);
    expect(r.status).toBe("만료(공실)");
    expect(r.daysLeft).toBeLessThan(0);
  });
  it("30일 안에 끝나면 만료임박", () => {
    expect(contractStatus({ ...base, leaseEnd: "2026-09-20" }, today).status).toBe("만료임박");
  });
  it("아직 시작 전이면 예정", () => {
    expect(contractStatus({ ...base, leaseStart: "2026-10-01", leaseEnd: "2027-09-30" }, today).status)
      .toBe("예정");
  });
  it("기간이 없으면 기간미상", () => {
    expect(contractStatus({ ...base, leaseStart: null, leaseEnd: null }, today).status).toBe("기간미상");
  });
});

describe("detectIssues — 잘못된 입력 포착", () => {
  const today = new Date("2026-09-02T00:00:00Z");
  const msgs = (cs: RentalContract[]) => detectIssues(cs, today).map((i) => i.message).join(" | ");

  it("정상 계약은 아무것도 잡지 않는다", () => {
    expect(detectIssues([base], today)).toHaveLength(0);
  });
  it("같은 주소가 두 번이면 중복으로 잡는다", () => {
    expect(msgs([base, { ...base, agency: "인천부동산" }])).toContain("중복");
  });
  it("부동산·월세 누락은 심각으로 잡는다", () => {
    const issues = detectIssues([{ ...base, agency: "", monthlyRent: 0 }], today);
    expect(issues.filter((i) => i.level === "high").length).toBeGreaterThanOrEqual(2);
  });
  it("월세를 만원 단위로 적으면 잡는다", () => {
    expect(msgs([{ ...base, monthlyRent: 60, deposit: 1000 }])).toContain("만원 단위");
  });
  it("보증금이 월세에 비해 비정상적으로 크면 잡는다", () => {
    expect(msgs([{ ...base, deposit: 600_000 * 300 }])).toContain("단위를 확인");
  });
  it("계약 종료가 시작보다 빠르면 잡는다", () => {
    expect(msgs([{ ...base, leaseStart: "2026-12-01", leaseEnd: "2026-01-01" }])).toContain("빠릅니다");
  });
  it("만료된 계약은 공실 확인을 요구한다", () => {
    expect(msgs([{ ...base, leaseEnd: "2026-07-31" }])).toContain("공실");
  });
});

describe("summarize", () => {
  const today = new Date("2026-09-02T00:00:00Z");
  it("부동산별 집계와 공실 전환 목록을 만든다", () => {
    const cs: RentalContract[] = [
      base,
      { ...base, address: "인천 남동구 예시로 2", agency: "인천부동산", monthlyRent: 400_000, leaseEnd: "2026-08-01" },
    ];
    const s = summarize(cs, [{ period: "2026-08", charged: 1_000_000, paid: 700_000, unpaid: 300_000 }], [], today);
    expect(s.totals.contractCount).toBe(2);
    expect(s.totals.monthlyRentSum).toBe(1_000_000);
    expect(s.totals.unpaidSum).toBe(300_000);
    expect(s.totals.collectionRate).toBeCloseTo(0.7);
    expect(s.byAgency.map((a) => a.agency)).toEqual(["미래부동산", "인천부동산"]);
    expect(s.vacancySoon).toHaveLength(1);
    expect(s.vacancySoon[0].address).toBe("인천 남동구 예시로 2");
    expect(s.statusCount["임대중"]).toBe(1);
  });
});

describe("calcSettlement — 정산", () => {
  const today = new Date("2026-09-02T00:00:00Z");
  const s = summarize([base], [{ period: "2026-08", charged: 1_000_000, paid: 600_000, unpaid: 400_000 }], [], today);

  it("입금액 기준이 기본 — 못 받은 돈을 수익으로 잡지 않는다", () => {
    const r = calcSettlement(s, { feeRatePercent: 40, basis: "paid" });
    expect(r.base).toBe(600_000);
    expect(r.fee).toBe(240_000);
    expect(r.ownerShare).toBe(360_000);
  });
  it("청구액 기준은 미수까지 포함한다", () => {
    expect(calcSettlement(s, { feeRatePercent: 40, basis: "charged" }).base).toBe(1_000_000);
  });
  it("투입비는 우리 몫에서 먼저 회수한다", () => {
    const r = calcSettlement(s, { feeRatePercent: 40, basis: "paid", costToRecover: 100_000 });
    expect(r.costRecovered).toBe(100_000);
    expect(r.netToUs).toBe(140_000);
    expect(r.remainingCost).toBe(0);
  });
  it("투입비가 우리 몫보다 크면 남은 금액을 알려준다", () => {
    const r = calcSettlement(s, { feeRatePercent: 40, basis: "paid", costToRecover: 500_000 });
    expect(r.netToUs).toBe(0);
    expect(r.remainingCost).toBe(260_000);
  });
  it("수익률은 0~100%로 묶는다", () => {
    expect(calcSettlement(s, { feeRatePercent: 999, basis: "paid" }).fee).toBe(600_000);
    expect(calcSettlement(s, { feeRatePercent: -5, basis: "paid" }).fee).toBe(0);
  });
});
