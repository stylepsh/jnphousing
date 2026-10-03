import type { SheetUnit } from "./all-parser";
import type { Ledger, LedgerEntry } from "./ledger-parser";

/** 시트 화면들 사이의 연결 주소와 짝맞추기 규칙 — 임대인 → 건물 → 호실 → 장부 */

export const landlordHref = (name: string) => `/admin/landlord-board/${encodeURIComponent(name)}`;
export const unitHref = (key: string) => `/admin/unit-board/${encodeURIComponent(key)}`;

const bkey = (s: string) => s.replace(/\(.*?\)|\s/g, "");
const ukey = (s: string) => s.replace(/호$/, "").replace(/\s/g, "");

/** 장부 건물명이 ALL 과 조금 다르다("하이안"/"하이안", "오복빌(3룸)"/"오복빌", "아이빌A"/"아에이") */
export function sameBuilding(a: string, b: string): boolean {
  const x = bkey(a), y = bkey(b);
  if (!x || !y) return false;
  // ponytail: 앞 2글자 일치 비교 — 같은 임대인 안에서 건물명이 겹치면 틀릴 수 있다. 그때 별칭표를 둔다.
  return x === y || x.startsWith(y) || y.startsWith(x) || x.slice(0, 2) === y.slice(0, 2);
}

/** 호실 하나에 해당하는 장부 거래 */
export function entriesForUnit(u: SheetUnit, ledger: Ledger | undefined): LedgerEntry[] {
  if (!ledger) return [];
  const unit = ukey(u.unit);
  return ledger.entries.filter((e) => ukey(e.unit) === unit && (!e.building || sameBuilding(e.building, u.building)));
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export const man = (n: number) => (Math.abs(n) >= 10000 ? `${Math.round(n / 10000).toLocaleString("ko-KR")}만원` : won(n));

/** 퇴실정산 "에트빌 401호" / "박정욱 306호" 같은 글자로 ALL 호실 찾기 */
export function findUnitByText(text: string, units: SheetUnit[]): SheetUnit | undefined {
  const num = text.match(/(\d{2,4})\s*호/)?.[1];
  if (!num) return undefined;
  const t = text.replace(/\s/g, "");
  const cands = units.filter((u) => ukey(u.unit) === num);
  return cands.find((u) => t.includes(bkey(u.building)) || t.includes(u.landlord.replace(/㈜|\(주\)/g, ""))) ?? (cands.length === 1 ? cands[0] : undefined);
}

/** 보고서의 "김정호 / 후배", "파크엔시티", "황정현/서팀" → 임대인 이름 */
export function matchLandlord(name: string, landlords: string[]): string | undefined {
  const n = name.replace(/[\s㈜]|\(주\)/g, "");
  return landlords.find((l) => {
    const x = l.replace(/[\s㈜]|\(주\)/g, "");
    return n.startsWith(x) || x.startsWith(n.slice(0, 3)) || (n.slice(0, 2) === x.slice(0, 2) && n.length > 1);
  });
}
