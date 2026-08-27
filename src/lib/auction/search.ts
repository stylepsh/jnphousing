/**
 * 경매 화면 공통 검색 매칭.
 *
 * 주소에는 "인천 부평구 부평동 521-22 삼성캐슬 아파트 101동 202호" 처럼
 * 지번·건물명이 공백/기호 섞여 들어온다. 사용자는 "삼성캐슬아파트", "521-22",
 * "부평동 삼성캐슬" 처럼 붙여 치거나 나눠 치므로,
 * 공백·구두점을 무시하고 토큰 전부 포함(AND)으로 비교한다.
 */
const SQUASH_RE = /[\s.,·・‧'"()[\]<>{}\-–—_/\\]/g;

const squash = (s: string) => s.toLowerCase().replace(SQUASH_RE, "");

/** query 의 모든 토큰이 fields 중 어딘가에 (공백/기호 무시) 포함되면 true. 빈 검색어는 항상 true. */
export function textMatches(
  query: string | null | undefined,
  ...fields: (string | null | undefined)[]
): boolean {
  const tokens = (query ?? "").trim().split(/\s+/).map(squash).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = fields.map((f) => squash(f ?? "")).join("\n");
  return tokens.every((t) => hay.includes(t));
}
