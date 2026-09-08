import { describe, it, expect } from "vitest";
import {
  parseSearchNames,
  parseSearchAddresses,
  matchRows,
  matchAddressRows,
  suggestSimilar,
} from "./bulk-name-match";

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
    const r = matchRows(["김철수"], rows, false, false);
    expect(r.byName[0].matches).toEqual([{ row: rows[1], field: "tenant" }]);
  });
  it("fuzzy 를 끄면 완전 일치라 '김철수 외 2명' 은 안 걸리고, 부분 일치를 켜면 걸린다", () => {
    expect(matchRows(["김철수"], rows, false, false).byName[0].matches).toHaveLength(1);
    const p = matchRows(["김철수"], rows, true, false).byName[0].matches;
    expect(p.map((m) => m.row.id).sort()).toEqual(["2", "3"]);
  });
  it("기본은 비슷한 이름도 similar 표시로 같이 취합한다", () => {
    const m = matchRows(["김철수"], rows).byName[0].matches;
    expect(m.map((x) => [x.row.id, x.similar === true])).toEqual([
      ["2", false],
      ["3", true],
    ]);
  });
  it("한 글자 오타도 similar 로 걸린다", () => {
    const m = matchRows(["박제석"], rows).byName[0].matches;
    expect(m).toEqual([{ row: rows[0], field: "owner", similar: true }]);
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

describe("주소 모드", () => {
  const addrRows = [
    { id: "a", address: "인천광역시 부평구 부평동 222-2 스위트홈 제204호" },
    { id: "b", address: "인천광역시 부평구 부평동 222-2 스위트홈 제802호" },
    { id: "c", address: "인천광역시 부평구 부평동 12-13 한강캐슬 201호" },
  ];
  it("줄바꿈으로만 나누고 앞 번호를 뗀다 (주소 속 쉼표는 살린다)", () => {
    expect(parseSearchAddresses("1. 부평동 222-2, 스위트홈 204호\n부평동 12-13 한강캐슬 201호")).toEqual([
      "부평동 222-2, 스위트홈 204호",
      "부평동 12-13 한강캐슬 201호",
    ]);
  });
  it("시/도·'제' 표기가 달라도 같은 물건으로 잡는다", () => {
    const r = matchAddressRows(["부평동 222-2 스위트홈 204호"], addrRows);
    expect(r.byName[0].matches.map((m) => m.row.id)).toEqual(["a"]);
    expect(r.byName[0].matches[0].field).toBe("address");
  });
  it("호수가 다르면 안 잡는다", () => {
    expect(matchAddressRows(["부평동 222-2 스위트홈 999호"], addrRows).notFound).toHaveLength(1);
  });
  it("건물까지만 치면 그 건물 물건을 전부 준다", () => {
    expect(matchAddressRows(["부평동 222-2 스위트홈"], addrRows).byName[0].matches).toHaveLength(2);
  });
});

describe("주소 붙여넣기 — 줄바꿈이 날아간 경우", () => {
  it("호 뒤에 시/도가 바로 붙어도 나눈다", () => {
    const r = parseSearchAddresses(
      "인천광역시 부평구 부평동 222-2 스위트홈 204호 인천광역시 부평구 부평동 222-2 스위트홈 802호인천광역시 부평구 부평동 147-13 로뎀레뷰 502호",
    );
    expect(r).toEqual([
      "인천광역시 부평구 부평동 222-2 스위트홈 204호",
      "인천광역시 부평구 부평동 222-2 스위트홈 802호",
      "인천광역시 부평구 부평동 147-13 로뎀레뷰 502호",
    ]);
  });
  it("주소 한 건은 그대로 둔다", () => {
    expect(parseSearchAddresses("인천광역시 부평구 부평동 12-13 한강캐슬 201호")).toEqual([
      "인천광역시 부평구 부평동 12-13 한강캐슬 201호",
    ]);
  });
});

describe("주소 매칭 — 실제 DB 표기 흔들림", () => {
  const rows = [
    { id: "d", address: "경기 동두천시 송내동 665-3,665-6 송내주공 415동 13층 1306호 [동두천로 63]" },
    { id: "e", address: "경기 동두천시 송내동 665-3,665-6 송내주공 415동 5층 502호 [동두천로 63]" },
  ];
  it("시/도 표기·지번 병기·중간 층수·도로명 대괄호가 달라도 잡는다", () => {
    const r = matchAddressRows(["경기도 동두천시 송내동 665-3 송내주공 415동 1306호"], rows);
    expect(r.byName[0].matches.map((m) => m.row.id)).toEqual(["d"]);
  });
  it("도로명 주소를 그대로 붙여넣어도 잡는다", () => {
    const r = matchAddressRows(["동두천시 송내주공 415동 1306호 [동두천로 63]"], rows);
    expect(r.byName[0].matches.map((m) => m.row.id)).toEqual(["d"]);
  });
  it("동까지만 치면 그 동 물건이 전부", () => {
    expect(matchAddressRows(["송내주공 415동"], rows).byName[0].matches).toHaveLength(2);
  });
  it("호수가 다르면 안 잡는다", () => {
    expect(matchAddressRows(["송내주공 415동 9999호"], rows).notFound).toHaveLength(1);
  });
});
