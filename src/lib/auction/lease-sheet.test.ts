import { describe, expect, it } from "vitest";
import { mapLeaseHeader, parseLeaseMatrix } from "./lease-sheet";

const HEADER = [
  "번호", "임대인", "상세 주소", "사건번호", "점유(O거주/X공실/△재방문)", "현관비번", "비고",
  "임차인", "임차인 연락처", "보증금", "월세", "계약시작", "계약종료", "수금일", "중개사", "중개사 연락처", "수수료율",
];

describe("lease-sheet", () => {
  it("중개사 연락처 / 임차인 연락처 / 중개사를 서로 다른 칸으로 잡는다", () => {
    const m = mapLeaseHeader(HEADER);
    expect(m.tenantPhone).toBe(8);
    expect(m.brokerName).toBe(14);
    expect(m.brokerPhone).toBe(15);
    expect(m.propertyNo).toBe(0);
  });

  it("임차 정보가 있는 줄만 읽고, 만원 단위 월세·보증금을 원으로 보정한다", () => {
    const rows = parseLeaseMatrix([
      ["JNP 답사 결과 · 상품화 가능"],
      HEADER,
      ["📍 경기 안양시 만안구"],
      [2496, "강태구", "안양동 …", "2026-100156", "X", "1739", "", "홍길동", "010-1111-2222", 500, 50, "2026-10-01", "2027-09-30", "25", "안양부동산", "031-000-0000", "10"],
      [2445, "강호경", "박달동 …", "2026-100442", "X", "2580", "", "", "", "", "", "", "", "", "", "", ""],
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      propertyNo: 2496,
      caseNumber: "2026-100156",
      tenantName: "홍길동",
      tenantPhone: "010-1111-2222",
      deposit: 5_000_000,
      monthlyRent: 500_000,
      leaseStart: "2026-10-01",
      leaseEnd: "2027-09-30",
      dueDay: 25,
      brokerName: "안양부동산",
      brokerPhone: "031-000-0000",
      feeRate: 10,
    });
  });
});
