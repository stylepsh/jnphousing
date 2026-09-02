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
  // 만원 단위는 파서가 자동 보정하므로, 보정 후에도 남은 이상값만 여기서 잡는다.
  it("보정 후에도 월세가 1만원 미만이면 심각으로 잡는다", () => {
    const issues = detectIssues([{ ...base, monthlyRent: 60, deposit: 1000 }], today);
    expect(issues.some((i) => i.level === "high" && i.message.includes("값을 확인"))).toBe(true);
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

describe("calcSettlement — 실무 정산 방식", () => {
  const today = new Date("2026-09-02T00:00:00Z");
  const s = summarize([base], [{ period: "2026-08", charged: 1_000_000, paid: 600_000, unpaid: 400_000 }], [], today);

  it("수입에서 지출을 빼고 배분한다", () => {
    const r = calcSettlement(s, { profitSharePercent: 50, basis: "paid", expenses: 200_000 });
    expect(r.income).toBe(600_000);
    expect(r.netProfit).toBe(400_000);
    expect(r.ourProfit).toBe(200_000);
    expect(r.ownerProfit).toBe(200_000);
  });

  it("보증금도 배분율만큼 우리 보유분으로 더한다", () => {
    const r = calcSettlement(s, { profitSharePercent: 50, depositSharePercent: 50, basis: "paid" });
    expect(r.ourDeposit).toBe(5_000_000);
    expect(r.total).toBe(300_000 + 5_000_000);
  });

  it("실제 사례를 그대로 재현한다 (월세입금 487만 / 지출 187만 / 보증금 610만, 반씩)", () => {
    const real = summarize(
      [{ ...base, deposit: 6_100_000 }],
      [{ period: "2026-08", charged: 4_870_000, paid: 4_870_000, unpaid: 0 }],
      [], today,
    );
    const r = calcSettlement(real, {
      profitSharePercent: 50, depositSharePercent: 50, basis: "paid", expenses: 1_870_000,
    });
    expect(r.netProfit).toBe(3_000_000);
    expect(r.ourProfit).toBe(1_500_000);
    expect(r.ourDeposit).toBe(3_050_000);
    expect(r.total).toBe(4_550_000);
  });

  it("투입비는 우리 몫에서 먼저 회수한다", () => {
    const r = calcSettlement(s, { profitSharePercent: 50, basis: "paid", costToRecover: 100_000 });
    expect(r.costRecovered).toBe(100_000);
    expect(r.total).toBe(200_000);
  });

  it("지출이 수입보다 크면 적자를 그대로 보여준다", () => {
    const r = calcSettlement(s, { profitSharePercent: 50, basis: "paid", expenses: 1_000_000 });
    expect(r.netProfit).toBe(-400_000);
    expect(r.ourProfit).toBeLessThan(0);
  });

  it("배분율은 0~100%로 묶는다", () => {
    expect(calcSettlement(s, { profitSharePercent: 999, basis: "paid" }).ourProfit).toBe(600_000);
    expect(calcSettlement(s, { profitSharePercent: -5, basis: "paid" }).ourProfit).toBe(0);
  });
});

describe("만원 단위 보정 · 자동연장 기간 추정", () => {
  it("월세 70 은 70만원으로 본다", () => {
    const { contracts, warnings } = parseContracts([row({ 7: 70, 6: 0 })]);
    expect(contracts[0].monthlyRent).toBe(700_000);
    expect(warnings.join(" ")).toContain("만원 단위");
  });

  it("월세도 만원 단위인 행에서만 보증금을 보정한다", () => {
    // 월세 45(만) + 보증금 500(만) → 둘 다 만원 단위
    expect(parseContracts([row({ 6: 500, 7: 45 })]).contracts[0].deposit).toBe(5_000_000);
  });

  it("월세가 원 단위면 보증금 70만원을 건드리지 않는다 (70억 되던 버그)", () => {
    const c = parseContracts([row({ 6: 700_000, 7: 700_000 })]).contracts[0];
    expect(c.deposit).toBe(700_000);
    expect(c.monthlyRent).toBe(700_000);
  });

  it("계약조건에 '6개월 만료후 자동연장' 이면 종료일을 계산한다", () => {
    const { contracts } = parseContracts([row({ 5: "6개월 만료후 자동연장", 9: "" })]);
    expect(contracts[0].leaseEnd).toBe("2026-06-30");
    expect(contracts[0].autoRenew).toBe(true);
  });

  it("자동연장 계약은 종료일이 지나도 공실로 보지 않는다", () => {
    const c = { ...base, leaseEnd: "2026-06-30", autoRenew: true };
    expect(contractStatus(c, new Date("2026-09-02T00:00:00Z")).status).toBe("자동연장");
  });
});
