import { describe, it, expect } from "vitest";
import { isBillable, lastDayOf } from "./revenue";

// 퇴거한 물건에 월세 청구가 만들어지던 문제(운영 정합성)의 회귀 테스트.
// 청구 대상 판정은 generateReceipts 서버 액션이 이 함수를 그대로 쓴다.

const LEASED = {
  pipelineState: "Leased",
  monthlyRent: 600_000,
  leaseStart: "2026-01-01",
  leaseEnd: null as string | null,
};

describe("lastDayOf — 월 말일", () => {
  it("31일 달", () => expect(lastDayOf("2026-01")).toBe("2026-01-31"));
  it("30일 달", () => expect(lastDayOf("2026-04")).toBe("2026-04-30"));
  it("평년 2월", () => expect(lastDayOf("2026-02")).toBe("2026-02-28"));
  it("윤년 2월", () => expect(lastDayOf("2024-02")).toBe("2024-02-29"));
});

describe("isBillable — 임대중 물건만 청구", () => {
  it("임대중이면 청구한다", () => {
    expect(isBillable(LEASED, "2026-03")).toBe(true);
  });

  it("퇴거해 임대가능으로 돌아간 물건은 월세 값이 남아 있어도 제외한다", () => {
    expect(isBillable({ ...LEASED, pipelineState: "Available" }, "2026-03")).toBe(false);
  });

  it("제외 처리된 물건도 청구하지 않는다", () => {
    expect(isBillable({ ...LEASED, pipelineState: "Rejected" }, "2026-03")).toBe(false);
  });

  it("상태가 비어 있으면 청구하지 않는다", () => {
    expect(isBillable({ ...LEASED, pipelineState: null }, "2026-03")).toBe(false);
  });

  it("월세가 0이거나 없으면 청구하지 않는다", () => {
    expect(isBillable({ ...LEASED, monthlyRent: 0 }, "2026-03")).toBe(false);
    expect(isBillable({ ...LEASED, monthlyRent: null }, "2026-03")).toBe(false);
  });
});

describe("isBillable — 계약 기간 경계", () => {
  it("계약 시작 전 달은 제외", () => {
    expect(isBillable({ ...LEASED, leaseStart: "2026-05-01" }, "2026-04")).toBe(false);
  });

  it("계약이 그 달 말일에 시작해도 포함", () => {
    expect(isBillable({ ...LEASED, leaseStart: "2026-04-30" }, "2026-04")).toBe(true);
  });

  it("만료된 다음 달은 제외", () => {
    expect(isBillable({ ...LEASED, leaseEnd: "2026-03-31" }, "2026-04")).toBe(false);
  });

  it("그 달 1일에 만료면 그 달까지는 포함", () => {
    expect(isBillable({ ...LEASED, leaseEnd: "2026-04-01" }, "2026-04")).toBe(true);
  });

  it("2월 말일 시작 — 30·31일로 잘못 계산하면 놓치던 경계", () => {
    // 과거 코드는 `${period}-31` 과 문자열 비교해 "2026-02-28" 시작 건을
    // 2월 청구에서 제외해버렸다.
    expect(isBillable({ ...LEASED, leaseStart: "2026-02-28" }, "2026-02")).toBe(true);
  });
});
