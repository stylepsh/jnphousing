import { describe, it, expect } from "vitest";
import { parseSearchNames, matchRows, suggestSimilar } from "./bulk-name-match";

describe("parseSearchNames", () => {
  it("괄호 안팎 이름을 둘 다 꺼낸다", () => {
    expect(parseSearchNames("최효준(이승연)")).toEqual(["최효준", "이승연"]);
    expect(parseSearchNames("HUANG WANS(박성훈)")).toEqual(["HUANG WANS", "박성훈"]);
  });
  it("이름이 아닌 괄호 꼬리표는 버린다", () => {
    expect(parseSearchNames("김철수(3건)")).toEqual(["김철수"]);
    expect(parseSearchNames("(주)파크앤시티")).toEqual(["파크앤시티"]);
  });
  it("줄바꿈·쉼표 섞인 명단을 중복 없이 편다", () => {
    expect(parseSearchNames("조해민, 배경조\n1. 서주영\n조해민")).toEqual([
      "조해민",
      "배경조",
      "서주영",
    ]);
  });
});

const rows = [
  { id: "1", owner_name: "박재석", tenant_name: null },
  { id: "2", owner_name: "㈜파크앤시티", tenant_name: "김철수" },
  { id: "3", owner_name: "김철수 외 2명", tenant_name: null },
];

describe("matchRows", () => {
  it("공백·법인표기를 무시하고 완전 일치로 찾는다", () => {
    const r = matchRows(["박 재석", "파크앤시티"], rows);
    expect(r.byName.map((b) => b.matches[0].row.id)).toEqual(["1", "2"]);
    expect(r.notFound).toEqual([]);
  });
  it("임차인 칸도 검색하고 어느 칸에서 맞았는지 알려준다", () => {
    const r = matchRows(["김철수"], rows);
    expect(r.byName[0].matches).toEqual([{ row: rows[1], field: "tenant" }]);
  });
  it("기본은 완전 일치라 '김철수 외 2명' 은 안 걸리고, 부분 일치를 켜면 걸린다", () => {
    expect(matchRows(["김철수"], rows).byName[0].matches).toHaveLength(1);
    const p = matchRows(["김철수"], rows, true).byName[0].matches;
    expect(p.map((m) => m.row.id).sort()).toEqual(["2", "3"]);
  });
  it("못 찾은 이름을 따로 돌려준다", () => {
    expect(matchRows(["없는사람"], rows).notFound).toEqual(["없는사람"]);
  });
});

describe("suggestSimilar", () => {
  it("한 글자 차이 오타를 추천한다", () => {
    expect(suggestSimilar("박제석", ["박재석", "홍길동"])).toEqual(["박재석"]);
  });
  it("꼬리표가 붙은 이름도 추천한다", () => {
    expect(suggestSimilar("김철수", ["김철수 외 2명"])).toEqual(["김철수 외 2명"]);
  });
});
