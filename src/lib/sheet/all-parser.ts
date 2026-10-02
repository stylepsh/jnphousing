/**
 * 구글 시트 "DM-임대관리현황" ALL 탭 → 호실 목록 + 월별 납부 판정.
 *
 * 경리가 시트를 계속 고치므로 열 위치는 고정하지 않고 헤더 글자로 찾는다.
 * 미납 판정 1순위는 "날짜 칸 있음 + 금액 칸 비어 있음 + 날짜 지남"이고,
 * 색(노랑·주황)은 보조 신호다. 하늘색은 방 이동(미납 아님)이다.
 */

export type Cell = { v: string; bg: string | null };

export type MonthState = "paid" | "unpaid" | "review" | "upcoming" | "event" | "none";

export interface MonthCell {
  ym: string; // "2026-09"
  dateText: string;
  amountText: string;
  amount: number | null;
  bg: string | null;
  state: MonthState;
}

export interface SheetUnit {
  key: string;
  row: number;
  status: string;
  landlord: string;
  address: string;
  building: string;
  unit: string;
  tenant: string;
  phones: string[];
  phoneText: string;
  memo: string;
  note: string;
  deposit: number;
  rent: number;
  fee: number;
  payType: string;
  payDay: string;
  moveIn: string;
  expiry: string;
  nameBg: string | null;
  movedOut: boolean; // 계약자 칸 초록 = 강제 문개방·퇴거
  expired: boolean;
  duplicateRows: number[]; // 같은 호실이 시트에 또 있는 행 (경리 확인 필요)
  months: MonthCell[];
  unpaidMonths: string[];
  unpaidAmount: number;
  streak: number; // 최근 연속 미납 개월
}

export interface SheetSnapshot {
  asOf: string; // 판정 기준일 (오늘, KST)
  sheetDate: string; // 시트 A1 기준일
  units: SheetUnit[];
}

const YELLOW = "FFFF00";
const ORANGE = "FF9900";
const GREEN = "00FF00";
const CYAN = "00FFFF";
const ARREARS_COLORS = new Set([YELLOW, ORANGE]);
const NA_COLORS = new Set([CYAN, "B7B7B7", "A6A6A6", "D9D9D9", "B6D7A8"]);
const EVENT_RE = /퇴실|정산|공실|종결|계약|입주|신규|만기|개방|연장|보증|이사|이체|~/;
// A열 구분 값. 아래쪽 요약표는 A열에 임대인 이름이 들어가므로 이 목록으로 거른다.
const STATUS_RE = /^(입주|상품|종결|보류|예정|미정|삼삼엠투)$/;
const INCOMING_RE = /^\d{1,2}\/\d{1,2}입주$/; // "10/11입주" = 입주 예정

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const norm = (s: string) => s.replace(/\s+/g, "");
// 수식 잔재("0", "=?", "#REF!")는 메모로 보이지 않게
const meaningful = (s: string) => (/^(=?\??|0|-|#REF!)$/.test(s) ? "" : s);

export function toAmount(s: string): number | null {
  const t = s.replace(/^=/, "").replace(/[,\s원]/g, "");
  return /^\d+$/.test(t) ? Number(t) : null;
}

/** "2026-09-14", "9/14", "2026. 9. 14" → 일(day). 날짜가 아니면 null */
function dayOf(s: string): number | null {
  const t = s.trim();
  let m = t.match(/^\d{4}[-.]\s*\d{1,2}[-.]\s*(\d{1,2})\.?$/);
  if (m) return Number(m[1]);
  m = t.match(/^\d{1,2}\/(\d{1,2})$/);
  if (m) return Number(m[1]);
  return null;
}

function toIso(s: string): string {
  const m = s.trim().match(/^(\d{2,4})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})/); // "2026. 2. 14" 표시 형식 포함
  if (!m) return "";
  const y = m[1].length === 2 ? `20${m[1]}` : m[1];
  return `${y}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

export function classifyMonth(ym: string, date: Cell, amount: Cell, asOf: string, moveInIso: string): MonthState {
  const amt = toAmount(amount.v);
  if (amt !== null && amt > 0) return "paid";
  if (/완납|계좌/.test(amount.v)) return "paid"; // "*완납", "*임이사계좌" = 임대인 직접 수령
  const d = date.v.trim();
  if (!d) return "none";
  if (ym > asOf.slice(0, 7)) return "upcoming";
  if (date.bg && NA_COLORS.has(date.bg)) return "event";
  if (moveInIso && ym < moveInIso.slice(0, 7)) return "event";
  const day = dayOf(d);
  if (day !== null) {
    // 연도 오기("2026-12-19"가 25년12월 칸)가 있어 날짜는 칸의 년월 + 일로 본다
    const due = `${ym}-${String(day).padStart(2, "0")}`;
    return due > asOf ? "upcoming" : "unpaid";
  }
  if (EVENT_RE.test(d)) return "event";
  if (date.bg && ARREARS_COLORS.has(date.bg)) return "unpaid"; // "연락두절" 등
  if (d.includes("->")) return "review"; // 입금일은 적었는데 금액이 없다
  return "event";
}

function findCol(header: string[], name: string, from = 0): number {
  for (let i = Math.max(from, 0); i < header.length; i++) if (norm(header[i]) === name) return i;
  return -1;
}

export function parseAllSheet(grid: Cell[][], asOf: string): SheetSnapshot {
  const hRow = grid.findIndex(
    (r, i) => i < 10 && r.some((c) => norm(c.v) === "호수") && r.some((c) => norm(c.v) === "계약자"),
  );
  if (hRow < 0) throw new Error("ALL 탭에서 헤더(호수·계약자)를 찾지 못했습니다.");
  const header = grid[hRow].map((c) => c.v);

  const col = {
    status: findCol(header, "구분"),
    landlord: findCol(header, "임대인"),
    address: findCol(header, "주소"),
    building: findCol(header, "건물명"),
    unit: findCol(header, "호수"),
    tenantName: findCol(header, "계약자"),
    memo: findCol(header, "메모"),
  };
  const dep = findCol(header, "보증금");
  const c2 = {
    rent: findCol(header, "월세", dep),
    fee: findCol(header, "관리비", dep),
    tenant: findCol(header, "임차인", dep),
    phone: findCol(header, "연락처", dep),
    payType: findCol(header, "선불/후불", dep),
    payDay: findCol(header, "입금일", dep),
    moveIn: findCol(header, "입주일", dep),
    expiry: findCol(header, "만료일", dep),
  };
  const note = findCol(header, "비고", c2.expiry);

  // 월 열: "26년9월" 이 두 칸씩 (날짜, 금액)
  const months: { ym: string; date: number; amount: number }[] = [];
  header.forEach((h, i) => {
    const m = norm(h).match(/^(\d{2})년(\d{1,2})월$/);
    if (!m) return;
    const ym = `20${m[1]}-${m[2].padStart(2, "0")}`;
    const prev = months[months.length - 1];
    if (prev && prev.ym === ym) prev.amount = i;
    else months.push({ ym, date: i, amount: i + 1 });
  });

  const get = (r: Cell[], i: number) => (i >= 0 && r[i] ? clean(r[i].v) : "");
  const empty: Cell = { v: "", bg: null };
  const byKey = new Map<string, SheetUnit>();

  for (let i = hRow + 1; i < grid.length; i++) {
    const r = grid[i];
    const raw = get(r, col.status);
    const status = INCOMING_RE.test(raw) ? "예정" : raw;
    const unit = get(r, col.unit);
    if (!unit || !STATUS_RE.test(status)) continue;

    const address = get(r, col.address);
    const building = get(r, col.building);
    const key = `${norm(address || building)}|${norm(unit)}`;
    const moveIn = toIso(get(r, c2.moveIn));
    const expiry = toIso(get(r, c2.expiry));
    const rent = toAmount(get(r, c2.rent)) ?? 0;
    const nameBg = r[col.tenantName]?.bg ?? null;
    const phoneText = get(r, c2.phone);

    const mcells: MonthCell[] = months.map((m) => {
      const dc = r[m.date] ?? empty;
      const ac = r[m.amount] ?? empty;
      return {
        ym: m.ym,
        dateText: clean(dc.v),
        amountText: clean(ac.v),
        amount: toAmount(ac.v),
        bg: dc.bg,
        state: classifyMonth(m.ym, dc, ac, asOf, moveIn),
      };
    });

    const occupied = status === "입주";
    const unpaid = occupied ? mcells.filter((m) => m.state === "unpaid") : [];
    let streak = 0;
    if (occupied) {
      for (let k = mcells.length - 1; k >= 0; k--) {
        const s = mcells[k].state;
        if (s === "upcoming" || s === "none") continue;
        if (s !== "unpaid") break;
        streak++;
      }
    }
    // 노랑·주황인데 일부만 낸 달은 모자란 만큼 더한다
    const shortfall = occupied
      ? mcells
          .filter((m) => m.state === "paid" && m.amount && m.bg && ARREARS_COLORS.has(m.bg) && m.amount < rent)
          .reduce((s, m) => s + (rent - (m.amount ?? 0)), 0)
      : 0;

    const u: SheetUnit = {
      key,
      row: i + 1,
      status,
      landlord: get(r, col.landlord),
      address,
      building,
      unit,
      tenant: get(r, c2.tenant) || get(r, col.tenantName).replace(/^=/, ""),
      phones: phoneText.match(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g)?.map((p) => p.replace(/\s/g, "")) ?? [],
      phoneText,
      memo: ((m) => (norm(m) === norm(get(r, col.tenantName).replace(/^=/, "")) ? "" : m))(meaningful(get(r, col.memo))), // 계약자 이름만 복사된 메모는 숨김
      note: meaningful(get(r, note)),
      deposit: toAmount(get(r, dep)) ?? 0,
      rent,
      fee: toAmount(get(r, c2.fee)) ?? 0,
      payType: get(r, c2.payType),
      payDay: get(r, c2.payDay),
      moveIn,
      expiry,
      nameBg,
      movedOut: nameBg === GREEN,
      expired: occupied && !!expiry && expiry < asOf,
      duplicateRows: [],
      months: mcells,
      unpaidMonths: unpaid.map((m) => m.ym),
      unpaidAmount: unpaid.length * rent + shortfall,
      streak,
    };

    // ponytail: 같은 호실이 여러 행이면 아래쪽 행을 최신으로 본다 (경리 확인 전 임시 규칙)
    const prev = byKey.get(key);
    if (prev) u.duplicateRows = [...prev.duplicateRows, prev.row];
    byKey.set(key, u);
  }

  return { asOf, sheetDate: clean(grid[0]?.[0]?.v ?? ""), units: [...byKey.values()] };
}
