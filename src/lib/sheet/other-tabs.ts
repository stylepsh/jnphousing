/**
 * 퇴실정산 · 삼삼엠투 · 보고서 탭 파서. 셋 다 경리가 손으로 만든 양식이라 헤더/라벨 글자로 찾는다.
 */

import type { Cell } from "./all-parser";
import { toNumber } from "./ledger-parser";

const norm = (s: string) => s.replace(/\s+/g, "");
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const at = (r: Cell[] | undefined, i: number) => (i >= 0 ? clean(r?.[i]?.v ?? "") : "");
const isPending = (s: string) => /^=\?$|미정산|정산\s*필요|협의|확인/.test(s);

// ───────────────────────── 퇴실정산 ─────────────────────────

export interface MoveOutLine { item: string; income: number; deduct: number; refund: number; note: string }
export interface MoveOut {
  row: number;
  property: string; // "에트빌 401호" / "정릉동725-19(트라움2차) 503호"
  terms: string; // "(100/70/10)" 보증금/월세/관리비(만원)
  tenant: string;
  period: string; // "25.07.10 ~ 25.01.09 · 6개월"
  reason: string;
  lines: MoveOutLine[];
  totalIn: number;
  totalDeduct: number;
  refund: number; // + 돌려줄 돈, − 더 받을 돈
  pending: boolean; // 미정산·협의·빈 계산칸이 남아 있음
  notes: string[];
}

/** "퇴실정산" 제목 줄마다 한 블록: 물건 / 임차인 / 기간 / 사유 / (구분 헤더) / 항목들 / 계 */
export function parseMoveOuts(grid: Cell[][]): MoveOut[] {
  const starts = grid.flatMap((r, i) => (norm(at(r, 0)).startsWith("퇴실정산") ? [i] : []));
  return starts.map((s, k) => {
    const end = starts[k + 1] ?? grid.length;
    const block = grid.slice(s + 1, end);
    const byLabel = (label: string) => block.find((r) => norm(at(r, 0)) === label);
    const obj = byLabel("물건");
    const unitPart = at(obj, 3);
    const period = byLabel("기간");
    const header = block.findIndex((r) => norm(at(r, 0)) === "구분");
    const total = block.find((r) => /^(계|합계|환급액)$/.test(norm(at(r, 0))));
    const lines: MoveOutLine[] = [];
    const notes: string[] = [];
    let pending = false;
    if (header >= 0) {
      for (const r of block.slice(header + 1)) {
        const item = at(r, 0);
        if (!item || /^(계|합계|환급액)$/.test(norm(item))) break;
        const vals = [at(r, 1), at(r, 2), at(r, 3)];
        lines.push({ item, income: toNumber(vals[0]), deduct: toNumber(vals[1]), refund: toNumber(vals[2]), note: at(r, 4) });
      }
    }
    for (const r of block) for (let j = 4; j < 7; j++) {
      const t = at(r, j);
      if (t && isPending(t)) { pending = true; if (!notes.includes(t)) notes.push(t); }
    }
    const refund = toNumber(at(total, 3));
    return {
      row: s + 1,
      property: [at(obj, 1), /^\d+호?$/.test(at(obj, 2)) ? at(obj, 2).replace(/호?$/, "호") : "", /호$/.test(unitPart) ? unitPart : ""].filter(Boolean).join(" "),
      terms: unitPart.includes("/") ? unitPart : "",
      tenant: at(byLabel("임차인"), 1),
      period: [[at(period, 1), at(period, 2)].filter(Boolean).join(" ~ "), at(period, 3)].filter(Boolean).join(" · "),
      reason: at(byLabel("사유"), 1),
      lines,
      totalIn: toNumber(at(total, 1)) || lines.reduce((a, l) => a + l.income, 0),
      totalDeduct: toNumber(at(total, 2)) || lines.reduce((a, l) => a + l.deduct, 0),
      refund: refund || lines.reduce((a, l) => a + l.refund, 0),
      pending: pending || !total || at(total, 3) === "=?",
      notes,
    };
  });
}

// ───────────────────────── 삼삼엠투 ─────────────────────────

export interface StayBooking {
  row: number;
  status: string; // 상품·입주·연장·예약·종결
  landlord: string;
  building: string;
  unit: string;
  guest: string;
  amount: number; // 이용금액
  paidDate: string;
  paid: number; // 입금액
  profit: number; // 비용정산후수익
  start: string;
  end: string;
  term: string;
  memo: string;
}

export function parseStays(grid: Cell[][]): { bookings: StayBooking[]; summary: { label: string; value: number }[] } {
  // 병합 칸은 첫 칸에만 값이 와서 헤더가 두 줄(구분·건물명… / 이용금액·입금액…)로 나뉜다 → 두 줄을 합친다
  const h = grid.findIndex((r, i) => i < 20 && r.some((c) => norm(c.v) === "이용금액"));
  if (h < 0) throw new Error("삼삼엠투 탭에서 헤더(이용금액)를 찾지 못했습니다.");
  const up = h > 0 ? grid[h - 1] : [];
  const head = Array.from({ length: Math.max(grid[h].length, up.length) }, (_, j) => norm(at(grid[h], j) || at(up, j)));
  const col = (name: string, from = 0) => head.findIndex((x, i) => i >= from && x.startsWith(name));
  const memoCol = col("메모");
  const c = {
    status: col("구분"), landlord: col("임대인"), building: col("건물명"), unit: col("호수"), guest: col("계약자"),
    amount: col("이용금액"), paidDate: col("입금일"), paid: col("입금액"), profit: col("비용정산후"),
    memo: memoCol, start: col("입주일", memoCol), end: col("만료일", memoCol), term: col("개월", memoCol),
  };
  const summary: { label: string; value: number }[] = [];
  for (const r of grid.slice(0, Math.max(0, h - 1))) for (let j = 0; j < r.length - 1; j++) {
    const t = at(r, j);
    const v = toNumber(at(r, j + 1));
    if (t && !/^[\d=.,-]/.test(t) && v && !summary.some((x) => x.label === t)) summary.push({ label: t, value: v });
  }
  const bookings: StayBooking[] = [];
  for (let i = h + 1; i < grid.length; i++) {
    const r = grid[i];
    const status = at(r, c.status).replace("삼품", "상품");
    if (!status || /^(합계|구분)$/.test(status) || !at(r, c.unit)) continue;
    bookings.push({
      row: i + 1, status, landlord: at(r, c.landlord), building: at(r, c.building), unit: at(r, c.unit), guest: at(r, c.guest),
      amount: toNumber(at(r, c.amount)), paidDate: at(r, c.paidDate), paid: toNumber(at(r, c.paid)), profit: toNumber(at(r, c.profit)),
      start: at(r, c.start), end: at(r, c.end), term: at(r, c.term), memo: at(r, c.memo),
    });
  }
  return { bookings, summary };
}

// ───────────────────────── 보고서 ─────────────────────────

export interface ReportBlock {
  row: number;
  title: string; // "26년 7월 단기임대 수익현황"
  ym: string | null; // "2026-07"
  basis: string; // "2026년7월31일 기준"
  columns: string[];
  rows: { name: string; cells: string[] }[];
  total: string[] | null;
}

/** 월마다 아래로 복사된 블록: 제목 → (기준일) → 2단 헤더 → 임대인별 행 → 계 */
export function parseReports(grid: Cell[][]): ReportBlock[] {
  const titles = grid.flatMap((r, i) => (/\d{2}년\s*\d{1,2}월.*(수익|지급)/.test(at(r, 0)) ? [i] : []));
  const blocks: ReportBlock[] = [];
  titles.forEach((t, k) => {
    const end = titles[k + 1] ?? grid.length;
    const title = at(grid[t], 0);
    const m = title.match(/(\d{2})년\s*(\d{1,2})월/);
    const h1 = grid.slice(t, end).findIndex((r) => norm(at(r, 1)) === "구분");
    if (h1 < 0) return;
    const hi = t + h1;
    const top = grid[hi];
    const next = grid[hi + 1];
    const sub = next && !/^\d+$/.test(at(next, 0)) && next.filter((c) => c.v.trim()).length >= 2 ? next : null;
    const width = Math.max(top.length, sub?.length ?? 0);
    const columns: string[] = [];
    let group = "";
    for (let j = 0; j < width; j++) {
      const b = sub ? at(sub, j) : "";
      let a = at(top, j);
      if (a) group = a;
      else if (b && j > 1) a = group; // 병합된 그룹명 이어 붙이기
      columns.push(a && b && a !== b ? `${a} · ${b}` : a || b);
    }
    const keep = columns.map((name, j) => j > 1 && !!name);
    let basis = "";
    for (const r of grid.slice(t, hi)) for (const c of r) if (/기준$/.test(clean(c.v))) basis = clean(c.v);
    const rows: { name: string; cells: string[] }[] = [];
    let total: string[] | null = null;
    for (const r of grid.slice(hi + (sub ? 2 : 1), end)) {
      const name = at(r, 1);
      if (!name) continue;
      const cells = columns.map((_, j) => at(r, j).replace(/^=\?$/, "").replace(/^=/, "")).filter((_, j) => keep[j]);
      if (norm(name) === "계") { total = cells; break; }
      if (!/^\d+$/.test(at(r, 0))) continue;
      rows.push({ name, cells });
    }
    if (rows.length) {
      blocks.push({
        row: t + 1, title, ym: m ? `20${m[1]}-${m[2].padStart(2, "0")}` : null, basis,
        columns: columns.filter((_, j) => keep[j]), rows, total,
      });
    }
  });
  return blocks;
}
