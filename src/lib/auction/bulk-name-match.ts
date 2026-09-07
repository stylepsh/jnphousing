/**
 * 이름 일괄 검색의 매칭 규칙 (순수 함수 — DB 접근 없음).
 *
 * 대표님이 넘기는 명단은 표기가 제각각이라 DB 값과 글자 그대로는 잘 안 맞는다.
 *   "박 재석" == "박재석"          공백 흔들림
 *   "㈜파크앤시티" == "파크앤시티"   법인 표기
 *   "최효준(이승연)"                괄호 안팎에 사람이 둘 (소유주/임차인 병기)
 * 그래서 비교는 전부 normalizeOwnerName 키로 하고, 검색 대상은 소유주·임차인 두 칸이다.
 */

import { normalizeAuctionAddress, normalizeOwnerName } from "./court-auction";
import { parseOwnerNames } from "./search";

/** 검색 대상 칸 */
export type MatchField = "owner" | "tenant" | "address";

export interface NameMatchable {
  owner_name: string | null;
  tenant_name?: string | null;
}

/**
 * 붙여넣은 명단 → 검색할 이름 배열.
 * parseOwnerNames(번호·꼬리표·중복 정리)를 그대로 쓰되, 괄호 안의 이름은 버리지 않고
 * 별개 이름으로 꺼내 둔다. "최효준(이승연)" 은 두 명 다 찾아야 한다.
 */
export function parseSearchNames(text: string): string[] {
  const expanded = (text ?? "").replace(/[([{]([^)\]}]*)[)\]}]/g, (whole, inner: string) =>
    // 괄호 안이 "3건"·"주"처럼 이름이 아니면(정규화하면 비거나 한 글자) 원본을 남겨 parseOwnerNames 가 떼게 둔다.
    normalizeOwnerName(inner).length >= 2 && /[가-힣a-zA-Z]/.test(inner) ? `\n${inner}\n` : whole,
  );
  return parseOwnerNames(expanded);
}

export interface NameMatch<T> {
  row: T;
  field: MatchField;
}

export interface MatchResult<T> {
  /** 입력 이름 → 걸린 행들. 걸린 이름만 들어간다(입력 순서 유지). */
  byName: { name: string; matches: NameMatch<T>[] }[];
  /** 한 건도 못 찾은 입력 이름 */
  notFound: string[];
}

/**
 * 이름 배열을 행 목록에 맞춰본다.
 * 기본은 완전 일치(정규화 키 동일), partial=true 면 포함까지 인정한다.
 * 한 행이 여러 이름에 걸릴 수 있다(소유주·임차인이 둘 다 명단에 있는 경우).
 */
export function matchRows<T extends NameMatchable>(
  names: string[],
  rows: T[],
  partial = false,
): MatchResult<T> {
  const keyed = rows.map((row) => ({
    row,
    owner: normalizeOwnerName(row.owner_name),
    tenant: normalizeOwnerName(row.tenant_name ?? ""),
  }));

  const byName: MatchResult<T>["byName"] = [];
  const notFound: string[] = [];

  for (const name of names) {
    const needle = normalizeOwnerName(name);
    if (!needle) continue;
    const matches: NameMatch<T>[] = [];
    for (const k of keyed) {
      const hitOwner = k.owner === needle || (partial && k.owner.includes(needle));
      const hitTenant = k.tenant === needle || (partial && !!k.tenant && k.tenant.includes(needle));
      if (hitOwner) matches.push({ row: k.row, field: "owner" });
      else if (hitTenant) matches.push({ row: k.row, field: "tenant" });
    }
    if (matches.length === 0) notFound.push(name);
    else byName.push({ name, matches });
  }
  return { byName, notFound };
}

/** 편집거리가 max 이하인지. 오타 추천용이라 짧은 이름만 다루면 되므로 단순 DP. */
function withinDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  // ponytail: O(n*m) DP. 이름은 길어야 20자라 충분하다.
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length] <= max;
}

/**
 * 못 찾은 이름에 대해 "혹시 이 사람?" 후보를 고른다.
 * 한 글자 차이(오타)이거나 한쪽이 다른 쪽을 품는 경우("김철수" ⊂ "김철수외2명").
 */
export function suggestSimilar(name: string, pool: string[], max = 3): string[] {
  const needle = normalizeOwnerName(name);
  if (needle.length < 2) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cand of pool) {
    const key = normalizeOwnerName(cand);
    if (!key || key === needle || seen.has(key)) continue;
    if (key.includes(needle) || needle.includes(key) || withinDistance(needle, key, 1)) {
      seen.add(key);
      out.push(cand);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * 붙여넣은 주소 명단 → 검색할 주소 배열.
 * 주소에는 쉼표·괄호가 그대로 들어가므로(",", "(주)" 가 아니라 "222-2, 스위트홈") 줄바꿈으로만 나눈다.
 * 앞 번호("1.", "- ")만 떼고 나머지는 손대지 않는다.
 */
export function parseSearchAddresses(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const s = raw
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^[-•*]\s*/, "")
      .replace(/^\d+\s*[.)]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!s) continue;
    const key = normalizeAuctionAddress(s);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * 주소 비교 키 — 공백·기호를 지운 뒤(normalizeAuctionAddress) 표기 흔들림을 더 흡수한다.
 *   "인천광역시" = "인천",  "제204호" = "204호"
 * ponytail: 지번은 기호를 지우므로 "222-2" 와 "22-22" 가 같은 키가 된다.
 * 답사 명단 규모에선 부딪힐 일이 없지만, 오탐이 보이면 지번을 따로 파싱해야 한다.
 */
function addressKey(address: string | null | undefined): string {
  return normalizeAuctionAddress(address)
    .replace(/광역시|특별자치시|특별자치도|특별시/g, "")
    .replace(/제(?=\d)/g, "");
}

/**
 * 못 찾은 주소의 "혹시 이건가?" 후보 — 호수를 뗀 나머지(같은 건물)가 겹치는 주소를 준다.
 * 실제로는 호수 오타이거나, 같은 건물의 다른 호실만 수집돼 있는 경우가 대부분이다.
 */
export function suggestSimilarAddresses(address: string, pool: string[], max = 3): string[] {
  const building = addressKey(address).replace(/\d+호$/, "");
  if (building.length < 4) return [];
  const out: string[] = [];
  for (const cand of pool) {
    if (addressKey(cand).startsWith(building)) {
      out.push(cand);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * 주소로 맞춰본다. 이름과 달리 표기가 길고 흔들려서(시/도 생략, "제201호" vs "201호")
 * 완전 일치를 기대할 수 없다 — 공백·기호를 지운 키가 한쪽이 다른 쪽을 품으면 같은 물건으로 본다.
 */
export function matchAddressRows<T extends { address: string | null }>(
  addresses: string[],
  rows: T[],
): MatchResult<T> {
  const keyed = rows.map((row) => ({ row, key: addressKey(row.address) }));
  const byName: MatchResult<T>["byName"] = [];
  const notFound: string[] = [];
  for (const addr of addresses) {
    const needle = addressKey(addr);
    if (!needle) continue;
    const matches = keyed
      .filter((k) => k.key && (k.key.includes(needle) || needle.includes(k.key)))
      .map((k) => ({ row: k.row, field: "address" as MatchField }));
    if (matches.length === 0) notFound.push(addr);
    else byName.push({ name: addr, matches });
  }
  return { byName, notFound };
}
