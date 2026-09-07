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

/**
 * 붙여넣은 이름 명단을 이름 배열로 — "이름 일괄 검색"용.
 *
 * 대표님이 넘기는 명단은 형태가 제각각이다:
 *   줄바꿈/쉼표/탭 구분, "1. 김철수" 같은 번호, "김철수(3건)" 같은 꼬리표,
 *   "김철수 외 2명" 같은 공동소유 표기, 엑셀에서 복사한 따옴표.
 * 전부 이름만 남기고, 순서를 지키며 중복은 한 번만 돌려준다.
 */
export function parseOwnerNames(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of (text ?? "").split(/[\n\r,;\t|]+/)) {
    let s = rawLine.trim();
    if (!s) continue;
    s = s.replace(/^["']|["']$/g, "").trim();
    // 앞 번호: "1." "1)" "- " "• "
    s = s.replace(/^[-•*]\s*/, "").replace(/^\d+\s*[.)]\s*/, "");
    // 꼬리표: "(3건)" "[HUG]" "외 2명" "- 3건"
    s = s.replace(/[([{][^)\]}]*[)\]}]/g, " ");
    s = s.replace(/\s*외\s*\d*\s*명?\s*$/u, "");
    s = s.replace(/\s*[-–—]?\s*\d+\s*건\s*$/u, "");
    s = s.replace(/\s+/g, " ").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
