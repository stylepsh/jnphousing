import { describe, it, expect } from "vitest";
import {
  mapOccupancy,
  splitOwnerCreditor,
  cleanAddress,
  normalizeRow,
  extractRowsFromCsv,
} from "./survey-sheet";

describe("mapOccupancy", () => {
  it("maps O/X/△ and variants", () => {
    expect(mapOccupancy("O")).toBe("occupied");
    expect(mapOccupancy("o")).toBe("occupied");
    expect(mapOccupancy("X")).toBe("vacant");
    expect(mapOccupancy("x")).toBe("vacant");
    expect(mapOccupancy("△")).toBe("recheck");
    expect(mapOccupancy("▲")).toBe("recheck");
    expect(mapOccupancy("세모")).toBe("recheck");
    expect(mapOccupancy("")).toBeNull();
    expect(mapOccupancy(null)).toBeNull();
  });
});

describe("splitOwnerCreditor", () => {
  it("splits owner name from HUG/SGI creditor", () => {
    expect(splitOwnerCreditor("박국섭 주택도시보증공사")).toEqual({ ownerName: "박국섭", creditor: "주택도시보증공사" });
    expect(splitOwnerCreditor("한윤종 서울보증보험")).toEqual({ ownerName: "한윤종", creditor: "서울보증보험" });
  });
  it("handles owner only", () => {
    expect(splitOwnerCreditor("김철수")).toEqual({ ownerName: "김철수", creditor: null });
  });
  it("handles null", () => {
    expect(splitOwnerCreditor(null)).toEqual({ ownerName: null, creditor: null });
  });
});

describe("cleanAddress", () => {
  it("collapses newlines, extracts road-name, prefixes dong", () => {
    expect(cleanAddress("정왕동", "2027-1 5층 501호 \n[오이도5길 14]")).toEqual({
      address: "정왕동 2027-1 5층 501호",
      addressShort: "오이도5길 14",
    });
  });
  it("works without bracket", () => {
    expect(cleanAddress("신천동", "746-15 4층 402호")).toEqual({
      address: "신천동 746-15 4층 402호",
      addressShort: null,
    });
  });
});

describe("normalizeRow", () => {
  it("normalizes a full survey row end-to-end", () => {
    const out = normalizeRow({
      visitNo: "1", dong: "정왕동", addressDetail: "2027-1 5층 501호 \n[오이도5길 14]",
      caseNumber: "2026-50022", category: "다세대", ownerCreditor: "박국섭 주택도시보증공사",
      occupancy: "O", canOpen: null, merch: null, mail: "X", meter: "O", doorCode: "X",
      mgmtOffice: "관리실:", memo: "퇴거 예정이라고 함",
    });
    expect(out.caseNumber).toBe("2026-50022");
    expect(out.ownerName).toBe("박국섭");
    expect(out.creditorType).toBe("HUG");
    expect(out.occupancy).toBe("occupied");
    expect(out.address).toBe("정왕동 2027-1 5층 501호");
    expect(out.addressShort).toBe("오이도5길 14");
    expect(out.meterCheck).toEqual({ mail: "X", meter: "O" });
    expect(out.doorCode).toBeNull(); // "X" → null
  });
});

const SIHEUNG_CSV = `시흥 단기임대,,,,,,,,,,,
방문순번,동,상세 주소,사건번호,물건종류,임대인·채권,점유 상태,우편,계량기,현관비번,관리실,비고
1,정왕동,"2027-1 5층 501호
[오이도5길 14]",2026-50022,다세대,박국섭 주택도시보증공사,O,X,O,X,관리실:,
2,정왕동,"1942-1 계룡2차 212동 10층 1002호
[정왕대로28번길 8]",2025-53851,아파트,박성호 주택도시보증공사,O,X,O,X,관리실:,퇴거 예정이라고 함`;

// 안산식: 사건번호 칸이 없는 답사표도 감지되어야 한다.
const ANSAN_CSV = `안산 단기임대,,,,,,,,,
순번,동,상세 주소,임대인·채권,점유 상태,우편,계량기,현관비번,관리실,비고
1,건건동,"594 블레스빌 101동 202호
[건건7길 18]",박희천1 주택도시보증공사,X,,O,#4669#,관리실: 010-...,5월 전기 27920`;

describe("extractRowsFromCsv (사건번호 없는 시트)", () => {
  it("parses 안산식 sheet without 사건번호 column", () => {
    const { region, rows } = extractRowsFromCsv(ANSAN_CSV);
    expect(region).toBe("안산 단기임대");
    expect(rows).toHaveLength(1);
    expect(rows[0].caseNumber).toBeNull();
    expect(rows[0].occupancy).toBe("X");
    expect(rows[0].ownerCreditor).toBe("박희천1 주택도시보증공사");
    expect(rows[0].dong).toBe("건건동");
  });
});

describe("extractRowsFromCsv", () => {
  it("detects region title and parses rows with multiline cells", () => {
    const { region, rows } = extractRowsFromCsv(SIHEUNG_CSV);
    expect(region).toBe("시흥 단기임대");
    expect(rows).toHaveLength(2);
    expect(rows[0].caseNumber).toBe("2026-50022");
    expect(rows[0].dong).toBe("정왕동");
    expect(rows[0].occupancy).toBe("O");
    expect(rows[0].ownerCreditor).toBe("박국섭 주택도시보증공사");
    expect(rows[0].addressDetail).toContain("오이도5길 14");
    expect(rows[1].memo).toBe("퇴거 예정이라고 함");
  });
});
