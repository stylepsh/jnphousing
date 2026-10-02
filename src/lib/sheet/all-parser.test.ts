import { describe, expect, it } from "vitest";
import { parseAllSheet, type Cell } from "./all-parser";

const c = (v: string, bg: string | null = null): Cell => ({ v, bg });
// 열: 구분 임대인 주소 건물명 호수 계약자 메모 보증금 월세 관리비 임차인 연락처 입주일 만료일 비고 | 26년7월 x2 | 26년8월 x2 | 26년9월 x2 | 26년10월 x2
const header = ["구분", "임대인", "주소", "건물명", "호수", "계약자", "메모", "보증금", "월세", "관리비", "임차인", "연락처", "입주일", "만료일", "비고",
  "26년7월", "26년7월", "26년8월", "26년8월", "26년9월", "26년9월", "26년10월", "26년10월"].map((h) => c(h));
const base = (status: string, unit: string, months: Cell[], nameBg: string | null = null) => [
  c(status), c("가임대인"), c("가동 1-1"), c("가빌"), c(unit), c("홍길동", nameBg), c(""), c("1000000"), c("750,000"), c("100000"),
  c("홍길동"), c("010-1234-5678 010 9999 0000(아들)"), c("2026-02-14"), c("2027-02-13"), c(""), ...months,
];

describe("parseAllSheet", () => {
  const grid: Cell[][] = [
    [c("2026.09.30")],
    header,
    // 7월 납부, 8·9월 노랑 미납, 10월 미도래
    base("입주", "101", [c("7/11->12"), c("750,000"), c("2026-08-14", "FFFF00"), c("", "FFFF00"), c("9/14", "FFFF00"), c(""), c("2026-10-14"), c("")]),
    // 하늘색 = 방 이동 → 미납 아님, 주황 부분납 → 모자란 만큼
    base("입주", "102", [c("7/5", "00FFFF"), c(""), c("8/5", "FF9900"), c("500000", "FF9900"), c("9/5"), c("750000"), c(""), c("")]),
    // 요약표 행(A=임대인명)은 무시
    [c("가임대인"), c(""), c(""), c(""), c("3")],
    // 같은 호실 아래쪽 재기재 → 아래 행 채택
    base("상품", "101", [c(""), c(""), c(""), c(""), c(""), c(""), c(""), c("")], "00FF00"),
    base("10/11입주", "103", []),
  ];
  const s = parseAllSheet(grid, "2026-10-03");

  it("헤더와 기준일", () => {
    expect(s.sheetDate).toBe("2026.09.30");
    expect(s.units.map((u) => u.unit).sort()).toEqual(["101", "102", "103"]);
  });

  it("미납 = 날짜 있음 + 금액 없음 + 기한 지남", () => {
    const u = parseAllSheet(grid.slice(0, 3), "2026-10-03").units[0];
    expect(u.months.map((m) => m.state)).toEqual(["paid", "unpaid", "unpaid", "upcoming"]);
    expect(u.unpaidMonths).toEqual(["2026-08", "2026-09"]);
    expect(u.unpaidAmount).toBe(1_500_000);
    expect(u.streak).toBe(2);
    expect(u.phones).toEqual(["010-1234-5678", "01099990000"]);
  });

  it("하늘색은 미납 아님, 주황 부분납은 차액만", () => {
    const u = s.units.find((x) => x.unit === "102")!;
    expect(u.months[0].state).toBe("event");
    expect(u.unpaidMonths).toEqual([]);
    expect(u.unpaidAmount).toBe(250_000);
  });

  it("중복 호실은 아래 행을 쓰고 위 행 번호를 남긴다", () => {
    const u = s.units.find((x) => x.unit === "101")!;
    expect(u.status).toBe("상품");
    expect(u.duplicateRows).toEqual([3]);
    expect(u.movedOut).toBe(true);
  });

  it("'10/11입주'는 예정", () => {
    expect(s.units.find((x) => x.unit === "103")!.status).toBe("예정");
  });
});
