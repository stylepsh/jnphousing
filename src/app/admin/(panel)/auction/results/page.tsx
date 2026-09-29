import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { groupByRegion } from "@/lib/auction/survey-group";
import { textMatches } from "@/lib/auction/search";

export const metadata: Metadata = { title: "답사 결과 보기" };
export const dynamic = "force-dynamic";

// 답사자가 회수해 온 엑셀(점유·개방·상품화·우편·계량기·비번·비고)을 업로드된 그대로
// 공실 / 거주중 / 상품화 탭 × 지역별로 다시 펼쳐 보는 읽기 전용 화면.
const TABS = {
  vacant: "공실",
  occupied: "거주중",
  revisit: "재방문",
  merch: "상품화 가능",
} as const;
type Tab = keyof typeof TABS;

const CAN_OPEN: Record<string, string> = { possible: "가능", impossible: "불가", admin_check: "확인" };
const MERCH: Record<string, string> = { possible: "가능", hold: "보류", impossible: "불가" };

type Inspection = {
  can_open: string | null;
  merchandising_ready: string | null;
  created_at: string | null;
};
type Row = {
  id: string;
  property_no: number | null;
  owner_name: string | null;
  address: string;
  case_number: string;
  category: string | null;
  door_code: string | null;
  meter_check: { mail?: string; meter?: string } | null;
  survey_memo: string | null;
  survey_date: string | null;
  auction_inspection: Inspection[];
};

const COLS =
  "id, property_no, owner_name, address, case_number, category, door_code, meter_check, survey_memo, survey_date";

// ponytail: 상품화 탭은 "상품화=가능"으로 기록된 답사가 하나라도 있으면 포함(최신 답사만 보려면 뷰로 분리)
function tabQuery(supabase: Awaited<ReturnType<typeof createClient>>, tab: Tab, sel: string, head = false) {
  const q = supabase.from("auction_property").select(sel, head ? { count: "exact", head: true } : undefined);
  return tab === "merch"
    ? q.eq("auction_inspection.merchandising_ready", "possible").not("survey_status", "in", "(rejected,blocked)")
    : q.eq("survey_status", tab);
}
const inspSel = (tab: Tab) =>
  `${tab === "merch" ? "auction_inspection!inner" : "auction_inspection"}(can_open, merchandising_ready, created_at)`;

async function fetchCounts(): Promise<Record<Tab, number | null>> {
  const supabase = await createClient();
  const tabs = Object.keys(TABS) as Tab[];
  const res = await Promise.all(
    tabs.map((t) => tabQuery(supabase, t, t === "merch" ? `id, ${inspSel(t)}` : "id", true)),
  );
  return Object.fromEntries(tabs.map((t, i) => [t, res[i].count ?? null])) as Record<Tab, number | null>;
}

async function fetchRows(tab: Tab): Promise<Row[]> {
  const supabase = await createClient();
  const sel = `${COLS}, ${inspSel(tab)}`;
  const rows: Row[] = [];
  // PostgREST 기본 상한(1,000행)에 잘리지 않게 끝까지 페이지로 읽는다.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tabQuery(supabase, tab, sel)
      .order("property_no", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

const latest = (list: Inspection[]) =>
  [...list].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];

export default async function SurveyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; region?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab && sp.tab in TABS ? (sp.tab as Tab) : "vacant";
  const q = (sp.q ?? "").trim();

  let rows: Row[] = [];
  let counts: Record<Tab, number | null> | null = null;
  let loadError: string | null = null;
  try {
    [rows, counts] = await Promise.all([fetchRows(tab), fetchCounts()]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "불러오기 실패";
  }
  if (q) rows = rows.filter((r) => textMatches(q, r.case_number, r.address, r.owner_name));

  const groups = groupByRegion(rows);
  const region = sp.region && groups.some(([k]) => k === sp.region) ? sp.region : groups[0]?.[0];
  const list = groups.find(([k]) => k === region)?.[1] ?? [];

  const href = (p: { tab?: Tab; region?: string }) => {
    const u = new URLSearchParams();
    u.set("tab", p.tab ?? tab);
    if (p.region) u.set("region", p.region);
    if (q) u.set("q", q);
    return `/admin/auction/results?${u}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">답사 결과 보기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          답사자가 회수한 엑셀을 업로드한 내용 그대로 봅니다. 새 엑셀은{" "}
          <Link href="/admin/auction/survey" className="underline">답사 결과 입력</Link>에서 올리세요.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={href({ tab: t })}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              t === tab ? "bg-foreground text-background" : "bg-card hover:bg-muted"
            }`}
          >
            {TABS[t]} <span className="font-black">{counts?.[t] ?? ""}</span>
          </Link>
        ))}
        <form className="ml-auto flex gap-1" action="/admin/auction/results">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="사건번호·주소·임대인"
            className="h-9 w-48 rounded-lg border bg-background px-2 text-sm"
          />
          <button className="h-9 rounded-lg border px-3 text-sm">검색</button>
        </form>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          목록을 불러오지 못했습니다: {loadError}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {TABS[tab]} 물건이 없습니다.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {groups.map(([k, l]) => (
              <Link
                key={k}
                href={href({ region: k })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  k === region ? "bg-blue-600 text-white border-blue-600" : "bg-card hover:bg-muted"
                }`}
              >
                {k} <strong>{l.length}</strong>
              </Link>
            ))}
          </div>

          <p className="text-sm">
            <strong>{region}</strong> · {TABS[tab]} {list.length}건 (전체 {TABS[tab]} {rows.length}건 · {groups.length}개 지역)
          </p>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  {["번호", "임대인", "상세 주소", "사건번호", "종류", "개방", "상품화", "우편", "계량기", "현관비번", "비고(관리실)", "답사일"].map(
                    (h) => (
                      <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const i = latest(r.auction_inspection ?? []);
                  return (
                    <tr key={r.id} className="border-t align-top">
                      <td className="px-2 py-1.5 font-mono">{r.property_no ?? "-"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.owner_name ?? "-"}</td>
                      <td className="px-2 py-1.5">{r.address}</td>
                      <td className="px-2 py-1.5 font-mono whitespace-nowrap">{r.case_number}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.category ?? "-"}</td>
                      <td className="px-2 py-1.5">{i?.can_open ? CAN_OPEN[i.can_open] ?? i.can_open : "-"}</td>
                      <td className="px-2 py-1.5">{i?.merchandising_ready ? MERCH[i.merchandising_ready] ?? i.merchandising_ready : "-"}</td>
                      <td className="px-2 py-1.5">{r.meter_check?.mail ?? "-"}</td>
                      <td className="px-2 py-1.5">{r.meter_check?.meter ?? "-"}</td>
                      <td className="px-2 py-1.5 font-mono">{r.door_code ?? "-"}</td>
                      <td className="px-2 py-1.5">{r.survey_memo ?? ""}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.survey_date ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
