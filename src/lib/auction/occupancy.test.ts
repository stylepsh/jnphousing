import { describe, it, expect } from "vitest";
import { SURVEY_STATUS_OF, JUDGE_STATE_OF, OCCUPANCY_LABEL, type Occupancy } from "./occupancy";

/**
 * 점유 어휘는 답사 입력·판정·파이프라인·PDF 가 모두 참조하는 단일 출처다.
 * 값이 조용히 바뀌면 "공실인데 점유로 집계" 같은 사고가 나므로 고정한다.
 */
const ALL: Occupancy[] = ["vacant", "occupied", "recheck"];

describe("occupancy 단일 출처", () => {
  it("세 어휘 모두 매핑이 있다", () => {
    for (const o of ALL) {
      expect(SURVEY_STATUS_OF[o]).toBeTruthy();
      expect(JUDGE_STATE_OF[o]).toBeTruthy();
      expect(OCCUPANCY_LABEL[o]).toBeTruthy();
    }
  });

  it("survey_status 어휘 — recheck 은 revisit 으로 저장된다", () => {
    expect(SURVEY_STATUS_OF.vacant).toBe("vacant");
    expect(SURVEY_STATUS_OF.occupied).toBe("occupied");
    expect(SURVEY_STATUS_OF.recheck).toBe("revisit");
  });

  it("저장 어휘는 DB check 제약 안의 값이어야 한다", () => {
    const allowed = ["pending", "vacant", "occupied", "revisit", "skip", "rejected", "blocked"];
    for (const o of ALL) expect(allowed).toContain(SURVEY_STATUS_OF[o]);
  });

  it("판정 상태 — 공실은 승인, 점유는 보류, 재방문은 재확인", () => {
    expect(JUDGE_STATE_OF.vacant).toBe("Approved");
    expect(JUDGE_STATE_OF.occupied).toBe("OccupiedHold");
    expect(JUDGE_STATE_OF.recheck).toBe("Recheck");
  });

  it("화면 라벨", () => {
    expect(OCCUPANCY_LABEL.vacant).toBe("공실");
    expect(OCCUPANCY_LABEL.occupied).toBe("점유");
    expect(OCCUPANCY_LABEL.recheck).toBe("재방문");
  });

  it("서로 다른 어휘가 같은 값으로 뭉치지 않는다", () => {
    expect(new Set(ALL.map((o) => SURVEY_STATUS_OF[o])).size).toBe(ALL.length);
    expect(new Set(ALL.map((o) => JUDGE_STATE_OF[o])).size).toBe(ALL.length);
  });
});
