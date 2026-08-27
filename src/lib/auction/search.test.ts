import { describe, it, expect } from "vitest";
import { textMatches } from "./search";

const ADDR = "인천 부평구 부평동 521-22 삼성캐슬 아파트 제101동 202호 [부평대로 33]";

describe("textMatches", () => {
  it("빈 검색어는 모두 통과", () => {
    expect(textMatches("", ADDR)).toBe(true);
    expect(textMatches("   ", ADDR)).toBe(true);
  });

  it("아파트명을 붙여 쳐도 찾는다 (공백 무시)", () => {
    expect(textMatches("삼성캐슬아파트", ADDR)).toBe(true);
  });

  it("번지수로 찾는다 (하이픈 유무 무관)", () => {
    expect(textMatches("521-22", ADDR)).toBe(true);
    expect(textMatches("52122", ADDR)).toBe(true);
  });

  it("여러 토큰은 AND", () => {
    expect(textMatches("부평동 삼성캐슬", ADDR)).toBe(true);
    expect(textMatches("갈현동 삼성캐슬", ADDR)).toBe(false);
  });

  it("여러 필드에 걸쳐 매칭", () => {
    expect(textMatches("김민영 부평동", ADDR, "김민영")).toBe(true);
  });

  it("필드 경계를 넘어 이어붙지 않는다", () => {
    expect(textMatches("영인천", ADDR, "김민영")).toBe(false);
  });

  it("동/호수로도 찾는다", () => {
    expect(textMatches("101동202호", ADDR)).toBe(true);
  });

  it("실제 부평동 데이터: 번지+건물명으로 그 건만 찾는다", () => {
    const pool = [
      "인천광역시 부평구 부평동 458-3 투엠캐슬 604호",
      "인천광역시 부평구 부평동 505-4 삼성캐슬아파트 201호",
      "인천광역시 부평구 부평동 222-2 스위트홈 204호",
      "인천광역시 부평구 부평동 379-92 우주마루2차 비동803호",
    ];
    const hit = (q: string) => pool.filter((a) => textMatches(q, a));
    expect(hit("부평동 458-3 투엠캐슬")).toEqual([pool[0]]);
    expect(hit("투엠캐슬")).toEqual([pool[0]]);
    expect(hit("삼성캐슬 아파트")).toEqual([pool[1]]);
    expect(hit("222-2")).toEqual([pool[2]]);
    expect(hit("우주마루2차 803")).toEqual([pool[3]]);
    expect(hit("캐슬")).toEqual([pool[0], pool[1]]);
  });
});
