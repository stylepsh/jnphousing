import "server-only";

import { createClient } from "@/lib/supabase/server";
import { regionKey } from "@/lib/auction/survey-group";
import { textMatches } from "@/lib/auction/search";

// 답사 결과 보기 화면·엑셀 내보내기가 같은 목록을 쓰도록 조회/그룹 로직을 한곳에 둔다.
// 임차가 나간 물건(pipeline_state=Leased)은 공실·상품화 목록에서 빼고 "임차중"으로만 보인다.
export const TABS = {
  vacant: { label: "공실", tone: "border-red-200 bg-red-50 text-red-800" },
  occupied: { label: "거주중", tone: "border-slate-200 bg-slate-50 text-slate-800" },
  revisit: { label: "재방문", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  merch: { label: "상품화 가능", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  leased: { label: "임차중", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
} as const;
export type Tab = keyof typeof TABS;
export const TAB_KEYS = Object.keys(TABS) as Tab[];
export const ALL = "전체";
export const parseTab = (v: string | undefined): Tab => (v && v in TABS ? (v as Tab) : "vacant");

export const CAN_OPEN: Record<string, string> = { possible: "가능", impossible: "불가", admin_check: "확인" };
export const MERCH: Record<string, string> = { possible: "가능", hold: "보류", impossible: "불가" };
export const OCC_MARK: Record<string, string> = { vacant: "X", occupied: "O", revisit: "△" };

export type Inspection = {
  can_open: string | null;
  merchandising_ready: string | null;
  mail_status: string | null;
  comment: string | null;
  inspector_name: string | null;
  created_at: string | null;
};
export type Row = {
  id: string;
  property_no: number | null;
  owner_name: string | null;
  address: string;
  address_short: string | null;
  case_number: string;
  category: string | null;
  creditor: string | null;
  door_code: string | null;
  meter_check: { mail?: string; meter?: string } | null;
  survey_memo: string | null;
  survey_date: string | null;
  survey_status: string | null;
  pipeline_state: string | null;
  tenant_name: string | null;
  deposit: number | null;
  monthly_rent: number | null;
  lease_start: string | null;
  lease_end: string | null;
  rent_due_day: number | null;
  management_fee_rate: number | null;
  tenant_phone?: string | null;
  broker_name?: string | null;
  broker_phone?: string | null;
  auction_inspection: Inspection[];
};

const BASE_COLS =
  "id, property_no, owner_name, address, address_short, case_number, category, creditor, door_code, meter_check, survey_memo, survey_date, survey_status, pipeline_state, tenant_name, deposit, monthly_rent, lease_start, lease_end, rent_due_day, management_fee_rate";
// 044 마이그레이션(임차 연락처·중개사) 전에도 화면이 깨지지 않게, 컬럼이 없으면 BASE 로 한 번 더 읽는다.
const FULL_COLS = `${BASE_COLS}, tenant_phone, broker_name, broker_phone`;
let hasLeaseContact = true;
export const cols = () => (hasLeaseContact ? FULL_COLS : BASE_COLS);
type Res = { data: unknown; error: { code?: string; message: string } | null };
export async function withCols(run: (c: string) => PromiseLike<Res>): Promise<Res> {
  const res = await run(cols());
  if (res.error?.code === "42703" && hasLeaseContact) {
    hasLeaseContact = false;
    return run(cols());
  }
  return res;
}
export const INSP = "can_open, merchandising_ready, mail_status, comment, inspector_name, created_at";

export type Sb = Awaited<ReturnType<typeof createClient>>;

// 상품화 = "상품화=가능"으로 기록된 답사가 하나라도 있는 물건.
// 예전엔 auction_inspection!inner 조인 필터로 전체 물건(수만 건)을 훑어 탭이 수 초간 멈췄다.
// → 답사 기록에서 물건 id 를 먼저 뽑고(수백 건), 그 id 로만 물건을 읽는다. 요청 1번에 1회만 조회.
const merchIdCache = new WeakMap<Sb, Promise<string[]>>();
function merchIds(supabase: Sb): Promise<string[]> {
  let p = merchIdCache.get(supabase);
  if (!p) {
    p = (async () => {
      const ids = new Set<string>();
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("auction_inspection")
          .select("auction_property_id")
          .eq("merchandising_ready", "possible")
          .range(from, from + 999);
        if (error) throw new Error(error.message);
        for (const r of (data ?? []) as { auction_property_id: string }[]) ids.add(r.auction_property_id);
        if (!data || data.length < 1000) break;
      }
      return [...ids];
    })();
    merchIdCache.set(supabase, p);
  }
  return p;
}
const chunks = <T,>(a: T[], n = 200) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

function tabQuery(supabase: Sb, tab: Tab, sel: string, head = false, ids: string[] = []) {
  const q = supabase.from("auction_property").select(sel, head ? { count: "exact", head: true } : undefined);
  if (tab === "leased") return q.eq("pipeline_state", "Leased");
  const base = tab === "merch" ? q.in("id", ids).not("survey_status", "in", "(rejected,blocked)") : q.eq("survey_status", tab);
  return base.or("pipeline_state.is.null,pipeline_state.neq.Leased");
}
const inspSel = `auction_inspection(${INSP})`;

export async function fetchCounts(supabase: Sb): Promise<Record<Tab, number | null>> {
  const ids = await merchIds(supabase);
  const res = await Promise.all(
    TAB_KEYS.map(async (t) => {
      if (t !== "merch") return (await tabQuery(supabase, t, "id", true)).count ?? null;
      const parts = await Promise.all(chunks(ids).map((c) => tabQuery(supabase, t, "id", true, c)));
      return parts.reduce((s, r) => s + (r.count ?? 0), 0);
    }),
  );
  return Object.fromEntries(TAB_KEYS.map((t, i) => [t, res[i]])) as Record<Tab, number | null>;
}

export async function fetchRows(supabase: Sb, tab: Tab, q = ""): Promise<Row[]> {
  const rows: Row[] = [];
  if (tab === "merch") {
    const parts = await Promise.all(
      chunks(await merchIds(supabase)).map((c) => withCols((cl) => tabQuery(supabase, tab, `${cl}, ${inspSel}`, false, c))),
    );
    for (const { data, error } of parts) {
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as unknown as Row[]));
    }
    rows.sort((a, b) => (a.property_no ?? 0) - (b.property_no ?? 0));
  } else {
    // PostgREST 기본 상한(1,000행)에 잘리지 않게 끝까지 페이지로 읽는다.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await withCols((c) =>
        tabQuery(supabase, tab, `${c}, ${inspSel}`)
          .order("property_no", { ascending: true })
          .range(from, from + 999),
      );
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as unknown as Row[]));
      if (!Array.isArray(data) || data.length < 1000) break;
    }
  }
  return q ? rows.filter((r) => textMatches(q, r.case_number, r.address, r.owner_name)) : rows;
}

// 상품화 가능으로 답사됐지만 이미 임차가 나가 작업에서 빠진 물건
export async function fetchMerchLeased(supabase: Sb): Promise<Row[]> {
  const parts = await Promise.all(
    chunks(await merchIds(supabase)).map((c) =>
      withCols((cl) =>
        supabase.from("auction_property").select(`${cl}, ${inspSel}`).in("id", c).eq("pipeline_state", "Leased"),
      ),
    ),
  );
  const rows: Row[] = [];
  for (const { data, error } of parts) {
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as Row[]));
  }
  return rows.sort((a, b) => (a.property_no ?? 0) - (b.property_no ?? 0));
}

// 안산·수원 일부처럼 주소가 "본오동 …"으로 시·도 없이 저장된 물건은 한 칩으로 모은다.
// (동마다 칩이 1개씩 생겨 화면이 수백 칸으로 쪼개지던 문제)
export const NO_CITY = "시·구 미기재";
const PROVINCE = /^(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|충청|전북|전남|전라|경북|경남|경상|제주)/;
export const regionOf = (address: string) => (PROVINCE.test(address.trim()) ? regionKey(address) : NO_CITY);

export function group(rows: Row[]): [string, Row[]][] {
  const m = new Map<string, Row[]>();
  for (const r of rows) {
    const k = regionOf(r.address);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  for (const [, l] of m)
    l.sort((a, b) => (a.owner_name ?? "").localeCompare(b.owner_name ?? "") || a.address.localeCompare(b.address));
  return Array.from(m.entries()).sort(
    (a, b) => Number(a[0] === NO_CITY) - Number(b[0] === NO_CITY) || b[1].length - a[1].length,
  );
}

/** 지역 필터 적용 — ALL 이면 지역 순서대로 평탄화 */
export function inRegion(rows: Row[], region: string): Row[] {
  const g = group(rows);
  return region === ALL ? g.flatMap(([, l]) => l) : g.find(([k]) => k === region)?.[1] ?? [];
}

export const latest = (list: Inspection[]) =>
  [...(list ?? [])].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
export const won = (v: number | null) => (v == null ? "-" : `${v.toLocaleString("ko-KR")}원`);

export function fieldMessage(active: Row[], leasedOut: Row[], scope: string): string {
  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  const out = [
    `[JNP 상품화 작업 목록] ${today}${scope === ALL ? "" : ` · ${scope}`}`,
    `진행 ${active.length}건 (임차 완료 ${leasedOut.length}건 제외)`,
  ];
  for (const [region, list] of group(active)) {
    out.push("", `📍 ${region} (${list.length})`);
    for (const r of list)
      out.push(`- ${[`${r.property_no ?? "-"} ${r.address}`, r.door_code && `비번 ${r.door_code}`, r.survey_memo].filter(Boolean).join(" / ")}`);
  }
  if (leasedOut.length) {
    out.push("", "✅ 임차 완료 — 작업하지 마세요");
    for (const r of leasedOut)
      out.push(
        `- ${r.property_no ?? "-"} ${r.address}${r.tenant_name ? ` · ${r.tenant_name}` : ""}${r.monthly_rent ? ` · 월세 ${won(r.monthly_rent)}` : ""}`,
      );
  }
  return out.join("\n");
}

// 공실인데 상품화(가능)로 안 넘어간 이유 — 답사자가 적어 온 개방·상품화 값에서 판단.
export const WHY = {
  none: "답사 기록 없음",
  open_no: "개방 불가",
  open_check: "개방 확인 필요",
  merch_no: "상품화 불가",
  merch_hold: "상품화 보류",
} as const;
export type Why = keyof typeof WHY;

/** null = 상품화 가능(문제 없음). 아니면 가장 앞선 원인 1개. */
export function whyNotMerch(r: Row): Why | null {
  const i = latest(r.auction_inspection);
  if (!i) return "none";
  if (i.merchandising_ready === "possible") return null;
  if (i.can_open === "impossible") return "open_no";
  if (i.can_open === "admin_check") return "open_check";
  if (i.merchandising_ready === "impossible") return "merch_no";
  return "merch_hold";
}

/** 임차 중 물건의 들어올 돈 요약. 관리수수료 = 월세 × 수수료율(물건별). */
export function revenueOf(leased: Row[]) {
  let rent = 0, deposit = 0, fee = 0;
  for (const r of leased) {
    rent += r.monthly_rent ?? 0;
    deposit += r.deposit ?? 0;
    fee += Math.round((r.monthly_rent ?? 0) * ((r.management_fee_rate ?? 0) / 100));
  }
  const withRent = leased.filter((r) => (r.monthly_rent ?? 0) > 0).length;
  return { count: leased.length, rent, deposit, fee, avgRent: withRent ? Math.round(rent / withRent) : 0 };
}

export const period = (r: Row) =>
  r.lease_start || r.lease_end ? `${r.lease_start ?? "?"} ~ ${r.lease_end ?? "?"}` : "-";
