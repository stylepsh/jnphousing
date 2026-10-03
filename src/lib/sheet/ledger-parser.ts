/**
 * 임대인 장부 탭(1이지웅장부, 8박정욱장부, 서상철정산 …) → 거래 목록 + 월별 합계 + 시트 요약 블록.
 *
 * 탭마다 열 위치가 달라 헤더 글자(날짜·건물명·호수·계정·내용·수입·지출·임차인)로 찾는다.
 * 정산 비율은 시트 요약 블록이 정본이라 다시 계산하지 않고 그대로 보여준다(요약 블록 = 헤더 위 "라벨 → 금액" 쌍).
 */

import type { Cell } from "./all-parser";

export type EntryKind = "income" | "expense" | "deposit_in" | "deposit_out" | "payout";

export interface LedgerEntry {
  row: number;
  date: string | null; // ISO, 날짜가 아닌 값("정산", "미지급")이면 null
  dateText: string;
  ym: string | null;
  building: string;
  unit: string;
  account: string;
  memo: string;
  income: number;
  expense: number;
  tenant: string;
  kind: EntryKind;
}

export interface LedgerMonth {
  ym: string;
  income: number; // 보증금 제외 수입
  expense: number; // 보증금 반환·임대인 지급 제외 지출
  depositIn: number;
  depositOut: number;
  payout: number;
  byAccount: { account: string; income: number; expense: number }[];
}

export interface Ledger {
  tab: string;
  landlord: string;
  rule: string;
  asOfText: string; // 요약 블록의 "26.08.31현재"
  summary: { label: string; value: number }[];
  entries: LedgerEntry[];
  months: LedgerMonth[];
}

/** 장부 탭 ↔ 임대인 ↔ 정산 방식 (21개 탭 분석 결과, 정산 금액은 시트 요약 블록이 정본) */
export const LEDGER_TABS: { tab: string; landlord: string; rule: string }[] = [
  { tab: "1이지웅장부", landlord: "이지웅", rule: "이익 5:5 (임대인 50 · 당사 50), 관리비는 임대인 부담" },
  { tab: "2김상혁장부", landlord: "김상혁", rule: "위탁관리비형 — 임대료는 임대인, 당사는 호실당 월 위탁관리비" },
  { tab: "3김정호장부", landlord: "김정호", rule: "이익 50 : 25 : 25 (임대인 · 당사 · 후배)" },
  { tab: "4트라움장부2", landlord: "이장미", rule: "위탁관리비형 — 쌍문 월 15만, 교은·아세움 월 10만" },
  { tab: "6이재영장부(5일지급)", landlord: "이제영", rule: "이익 70 : 30, 매월 5일 지급" },
  { tab: "7임수형장부", landlord: "임수형", rule: "위탁관리비형 — 월 10만" },
  { tab: "8박정욱장부", landlord: "박정욱", rule: "이익 80 : 20" },
  { tab: "9황정현", landlord: "황정현", rule: "이익 60 : 40" },
  { tab: "서상철정산", landlord: "서상철", rule: "이익 60 : 40 (손실도 같은 비율)" },
];

const norm = (s: string) => s.replace(/\s+/g, "");
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** "1,050,000", "=1400000", "-300,000", "-" → 숫자 (아니면 0) */
export function toNumber(s: string): number {
  const t = s.replace(/^=/, "").replace(/[,\s원]/g, "");
  return /^-?\d+(\.\d+)?$/.test(t) ? Math.round(Number(t)) : 0;
}

function toIso(s: string): string | null {
  const m = s.match(/(\d{4})\s*[.\-/]+\s*(\d{1,2})\s*[.\-/]+\s*(\d{1,2})/);
  if (!m) return null;
  const mm = Number(m[2]), dd = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${m[1]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

const PAYOUT_RE = /임대인\s*이익금|이익금\s*지급|^정산$|\d+월\s*정산|정산\s*지급|임대인\s*지급/;

function kindOf(account: string, memo: string, unit: string, dateText: string, income: number, expense: number): EntryKind {
  const a = norm(account);
  if (a.startsWith("보증금반환")) return "deposit_out";
  if (a.startsWith("보증금")) return income >= expense ? "deposit_in" : "deposit_out";
  if (expense > 0 && [account, memo, unit, dateText].some((t) => PAYOUT_RE.test(t.trim()))) return "payout";
  return income >= expense ? "income" : "expense";
}

export function parseLedger(grid: Cell[][], tab: string, landlord: string, rule: string): Ledger {
  const h = grid.findIndex((r, i) => {
    if (i > 60) return false;
    const t = r.map((c) => norm(c.v));
    return t.includes("날짜") && t.includes("수입") && t.includes("지출") && t.includes("계정");
  });
  if (h < 0) throw new Error(`'${tab}' 탭에서 거래 헤더(날짜·계정·수입·지출)를 찾지 못했습니다.`);
  const header = grid[h].map((c) => norm(c.v));
  const col = (name: string) => header.indexOf(name);
  const c = {
    date: col("날짜"), building: col("건물명"), unit: col("호수"), account: col("계정"), memo: col("내용"),
    income: col("수입"), expense: col("지출"), tenant: col("임차인"),
  };
  const get = (r: Cell[], i: number) => (i >= 0 && r[i] ? clean(r[i].v) : "");

  // 요약 블록: 헤더 위에서 "글자 칸 → 바로 오른쪽 숫자 칸" 쌍
  const summary: { label: string; value: number }[] = [];
  let asOfText = "";
  for (let i = 0; i < h; i++) {
    const r = grid[i];
    for (let j = 0; j < r.length; j++) {
      const t = clean(r[j]?.v ?? "");
      if (!t) continue;
      if (/현재$/.test(t) && !asOfText) asOfText = t;
      if (/^[\d.,=\s-]+$/.test(t) || t.startsWith("=") || t.length > 20) continue;
      const v = toNumber(clean(r[j + 1]?.v ?? ""));
      if (v !== 0 && !summary.some((x) => x.label === t)) summary.push({ label: t, value: v });
    }
  }

  const entries: LedgerEntry[] = [];
  for (let i = h + 1; i < grid.length; i++) {
    const r = grid[i];
    const dateText = get(r, c.date);
    const account = get(r, c.account);
    const memo = get(r, c.memo);
    const unit = get(r, c.unit);
    const income = toNumber(get(r, c.income));
    const expense = toNumber(get(r, c.expense));
    if (!dateText && !account) continue; // 합계·빈 줄
    if (income === 0 && expense === 0) continue;
    const date = toIso(dateText);
    entries.push({
      row: i + 1, date, dateText, ym: date ? date.slice(0, 7) : null,
      building: get(r, c.building), unit, account, memo, income, expense, tenant: get(r, c.tenant),
      kind: kindOf(account, memo, unit, dateText, income, expense),
    });
  }

  const byYm = new Map<string, LedgerMonth>();
  for (const e of entries) {
    const ym = e.ym ?? "날짜없음";
    const m = byYm.get(ym) ?? { ym, income: 0, expense: 0, depositIn: 0, depositOut: 0, payout: 0, byAccount: [] };
    if (e.kind === "deposit_in") m.depositIn += e.income - e.expense;
    else if (e.kind === "deposit_out") m.depositOut += e.expense - e.income;
    else if (e.kind === "payout") m.payout += e.expense;
    else { m.income += e.income; m.expense += e.expense; }
    const acc = e.account || "(계정 없음)";
    let a = m.byAccount.find((x) => x.account === acc);
    if (!a) { a = { account: acc, income: 0, expense: 0 }; m.byAccount.push(a); }
    a.income += e.income;
    a.expense += e.expense;
    byYm.set(ym, m);
  }
  const months = [...byYm.values()].sort((a, b) => b.ym.localeCompare(a.ym));

  return { tab, landlord, rule, asOfText, summary, entries, months };
}
