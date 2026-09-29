import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { STATE_LABELS } from "@/lib/auction/pipeline/state-machine";
import { SurveyUpload } from "../survey/survey-upload";
import { CopyBox } from "./copy-box";
import { LeaseUpload } from "./lease-upload";
import {
  ALL, CAN_OPEN, INSP, MERCH, period, revenueOf, withCols, TABS, TAB_KEYS, fetchCounts, fetchMerchLeased, fetchRows, fieldMessage, group,
  latest, parseTab, regionOf, won, WHY, whyNotMerch, type Row, type Sb, type Tab, type Why,
} from "./data";

export const metadata: Metadata = { title: "답사 결과 보기" };
export const dynamic = "force-dynamic";

const stateLabel = (s: string | null) => (s ? STATE_LABELS[s as keyof typeof STATE_LABELS] ?? s : "-");

async function fetchDetail(supabase: Sb, id: string) {
  const [p, ev] = await Promise.all([
    withCols((c) =>
      supabase
        .from("auction_property")
        .select(
          `${c}, appraisal_value, minimum_bid, auction_date, survey_by, last_issued_at, last_issued_team, auction_inspection(${INSP})`,
        )
        .eq("id", id)
        .maybeSingle(),
    ),
    supabase
      .from("auction_pipeline_event")
      .select("created_at, from_state, to_state, performed_by, detail")
      .eq("auction_property_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  type Detail = Row & {
    appraisal_value: number | null;
    minimum_bid: number | null;
    auction_date: string | null;
    survey_by: string | null;
    last_issued_at: string | null;
    last_issued_team: string | null;
  };
  type Ev = { created_at: string; from_state: string | null; to_state: string | null; performed_by: string | null; detail: string | null };
  return { p: p.data as Detail | null, events: (ev.data ?? []) as Ev[] };
}

export default async function SurveyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; region?: string; q?: string; id?: string; why?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = parseTab(sp.tab);
  const q = (sp.q ?? "").trim();
  const supabase = await createClient();

  let rows: Row[] = [];
  let merchLeased: Row[] = [];
  let leasedAll: Row[] = [];
  let counts: Record<Tab, number | null> | null = null;
  let detail: Awaited<ReturnType<typeof fetchDetail>> | null = null;
  let loadError: string | null = null;
  try {
    [rows, counts, merchLeased, detail, leasedAll] = await Promise.all([
      fetchRows(supabase, tab, q),
      fetchCounts(supabase),
      tab === "merch" ? fetchMerchLeased(supabase) : Promise.resolve([]),
      sp.id ? fetchDetail(supabase, sp.id) : Promise.resolve(null),
      fetchRows(supabase, "leased"),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "불러오기 실패";
  }

  const groups = group(rows);
  const region = sp.region && groups.some(([k]) => k === sp.region) ? sp.region : ALL;
  const regionList = region === ALL ? groups.flatMap(([, l]) => l) : groups.find(([k]) => k === region)?.[1] ?? [];
  // 공실 탭: 상품화로 안 넘어간 이유별 집계·필터 (why=ok 상품화 가능 / not 전체 미전환 / 개별 사유)
  const whyOf = new Map(regionList.map((r) => [r.id, whyNotMerch(r)]));
  const why = tab === "vacant" && sp.why && (sp.why === "ok" || sp.why === "not" || sp.why in WHY) ? sp.why : undefined;
  const list = !why
    ? regionList
    : regionList.filter((r) => {
        const w = whyOf.get(r.id);
        return why === "ok" ? w === null : why === "not" ? w !== null : w === why;
      });
  const whyCount = (k: string) =>
    regionList.filter((r) => {
      const w = whyOf.get(r.id);
      return k === "ok" ? w === null : k === "not" ? w !== null : w === k;
    }).length;
  const leasedInScope = region === ALL ? merchLeased : merchLeased.filter((r) => regionOf(r.address) === region);
  const scopeLabel = region === ALL ? "전체 지역" : region;

  const params = (p: { tab?: Tab; region?: string; id?: string; why?: string | null }) => {
    const u = new URLSearchParams();
    const t = p.tab ?? tab;
    u.set("tab", t);
    const reg = t !== tab ? undefined : p.region ?? region;
    if (reg && reg !== ALL) u.set("region", reg);
    if (q) u.set("q", q);
    const w = t !== tab ? undefined : p.why === null ? undefined : p.why ?? why;
    if (w) u.set("why", w);
    if (p.id) u.set("id", p.id);
    return u.toString();
  };
  const href = (p: { tab?: Tab; region?: string; id?: string; why?: string | null }) => `/admin/auction/results?${params(p)}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black">답사 결과 보기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          현장팀 엑셀을 올리면 여기서 현황을 봅니다. 임차가 나간 물건은 공실·상품화에서 빠지고 &quot;임차중&quot;에만 보입니다.
        </p>
      </div>

      {/* 현황 카드 — 누르면 해당 목록 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {TAB_KEYS.map((t) => (
          <Link
            key={t}
            href={href({ tab: t })}
            className={`rounded-2xl border p-3 transition-shadow hover:shadow-md ${TABS[t].tone} ${
              t === tab ? "ring-2 ring-foreground" : ""
            }`}
          >
            <div className="text-xs font-bold opacity-80">{TABS[t].label}</div>
            <div className="mt-1 text-2xl font-black tabular-nums">{counts?.[t] ?? "-"}</div>
          </Link>
        ))}
      </div>

      {/* 들어올 돈 — 임차중 물건 기준 + 상품화 대기분 예상 */}
      {(() => {
        const rv = revenueOf(leasedAll);
        const waiting = counts?.merch ?? 0;
        const m = (n: number) => `${Math.round(n / 10_000).toLocaleString("ko-KR")}만원`;
        const items: [string, string, string][] = [
          ["임차중", `${rv.count}건`, "현재 임대 나간 물건"],
          ["월세 합계", m(rv.rent), `연 ${m(rv.rent * 12)}`],
          ["보증금 합계", m(rv.deposit), "임차인에게 받은 보증금"],
          ["월 관리수수료", m(rv.fee), `연 ${m(rv.fee * 12)} · 물건별 수수료율 기준`],
          ["상품화 대기 예상 월세", m(waiting * rv.avgRent), `${waiting}건 × 평균 월세 ${m(rv.avgRent)}`],
        ];
        return (
          <div className="rounded-2xl border bg-card p-3">
            <div className="mb-2 text-sm font-bold">들어올 예상 금액</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {items.map(([k, v, sub]) => (
                <div key={k} className="rounded-xl bg-muted/40 p-2.5">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="text-lg font-black tabular-nums">{v}</div>
                  <div className="text-[11px] text-muted-foreground">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 엑셀 주고받기 */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-5 space-y-2">
          <h3 className="font-black">엑셀 받기 (현장팀에 주기)</h3>
          <p className="text-xs text-muted-foreground">
            지금 보는 <b>{TABS[tab].label} · {scopeLabel}</b> {list.length}건을 엑셀로 받습니다. 재방문은 점유칸이 비어 있어 현장팀이
            채워 오면 옆에서 그대로 올리면 됩니다.{tab === "merch" && " 임차완료(작업제외) 시트가 함께 들어갑니다."}
          </p>
          <a
            href={`/admin/auction/results/export?${params({})}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" /> {TABS[tab].label} 엑셀 받기 ({list.length}건)
          </a>
        </div>
        <SurveyUpload />
        <LeaseUpload />
      </div>

      <form className="flex gap-1" action="/admin/auction/results">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={q}
          placeholder="사건번호·주소·임대인"
          className="h-9 w-56 rounded-lg border bg-background px-2 text-sm"
        />
        <button className="h-9 rounded-lg border px-3 text-sm">검색</button>
        {q && (
          <Link href={`/admin/auction/results?tab=${tab}`} className="h-9 px-3 text-sm leading-9 underline">
            검색 해제
          </Link>
        )}
      </form>

      {/* 상세 — 목록에서 물건을 누르면 열림 */}
      {detail?.p && (
        <div className="rounded-2xl border-2 border-foreground/20 bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-xs text-muted-foreground">
                {detail.p.property_no} · {detail.p.case_number}
              </div>
              <div className="font-bold">
                {detail.p.address}
                {detail.p.address_short ? ` [${detail.p.address_short}]` : ""}
              </div>
              <div className="text-sm text-muted-foreground">
                {detail.p.owner_name ?? "-"} · {detail.p.category ?? "-"} · 현재 단계{" "}
                <strong className="text-foreground">{stateLabel(detail.p.pipeline_state)}</strong>
              </div>
            </div>
            <Link href={href({})} className="rounded-lg border px-3 py-1 text-sm">
              닫기
            </Link>
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {(() => {
              const d = detail.p;
              const i = latest(d.auction_inspection);
              const kv: [string, string][] = [
                ["개방", CAN_OPEN[i?.can_open ?? ""] ?? "-"],
                ["상품화", MERCH[i?.merchandising_ready ?? ""] ?? "-"],
                ["우편", d.meter_check?.mail ?? "-"],
                ["계량기", d.meter_check?.meter ?? "-"],
                ["현관비번", d.door_code ?? "-"],
                ["비고(관리실)", d.survey_memo ?? "-"],
                ["답사일", d.survey_date ?? "-"],
                ["입력자", d.survey_by ?? "-"],
                ["마지막 발급", d.last_issued_at ? `${d.last_issued_at.slice(0, 10)} ${d.last_issued_team ?? ""}` : "-"],
                ["채권자", d.creditor ?? "-"],
                ["감정가", won(d.appraisal_value)],
                ["최저가", won(d.minimum_bid)],
                ["매각기일", d.auction_date ?? "-"],
                ["임차인", `${d.tenant_name ?? "-"} ${d.tenant_phone ?? ""}`],
                ["보증금/월세", `${won(d.deposit)} / ${won(d.monthly_rent)}`],
                ["임대 기간", period(d)],
                ["수금일", d.rent_due_day ? `매월 ${d.rent_due_day}일` : "-"],
                ["중개사", `${d.broker_name ?? "-"} ${d.broker_phone ?? ""}`],
                ["수수료율", d.management_fee_rate ? `${d.management_fee_rate}%` : "-"],
              ];
              return kv.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ));
            })()}
          </dl>
          {detail.p.auction_inspection?.length > 0 && (
            <div className="text-sm">
              <div className="mb-1 font-semibold">답사 기록</div>
              <ul className="space-y-0.5 text-muted-foreground">
                {[...detail.p.auction_inspection]
                  .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
                  .map((x, n) => (
                    <li key={n}>
                      {x.created_at?.slice(0, 10)} · {x.inspector_name ?? "-"} · 개방 {CAN_OPEN[x.can_open ?? ""] ?? "-"} · 상품화{" "}
                      {MERCH[x.merchandising_ready ?? ""] ?? "-"} · {x.comment ?? ""}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {detail.events.length > 0 && (
            <div className="text-sm">
              <div className="mb-1 font-semibold">진행 이력</div>
              <ul className="space-y-0.5 text-muted-foreground">
                {detail.events.map((e, n) => (
                  <li key={n}>
                    {e.created_at.slice(0, 10)} · {stateLabel(e.from_state)} → {stateLabel(e.to_state)} · {e.performed_by ?? ""}{" "}
                    {e.detail ?? ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          목록을 불러오지 못했습니다: {loadError}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {TABS[tab].label} 물건이 없습니다.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {[[ALL, rows] as [string, Row[]], ...groups].map(([k, l]) => (
              <Link
                key={k}
                href={href({ region: k })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  k === region ? "border-blue-600 bg-blue-600 text-white" : "bg-card hover:bg-muted"
                }`}
              >
                {k} <strong>{l.length}</strong>
              </Link>
            ))}
          </div>

          {tab === "merch" && (
            <details className="rounded-2xl border bg-yellow-50/60 p-3" open>
              <summary className="cursor-pointer text-sm font-bold">
                현장팀에 보낼 내용 — {scopeLabel} · 진행 {list.length}건 / 임차 완료 {leasedInScope.length}건 제외
              </summary>
              <div className="mt-2">
                <CopyBox text={fieldMessage(list, leasedInScope, region)} />
              </div>
            </details>
          )}

          {tab === "vacant" && (
            <div className="rounded-2xl border bg-card p-3 space-y-2">
              <div className="text-sm font-bold">상품화로 넘어갔나? — {scopeLabel} 공실 {regionList.length}건</div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(
                  [
                    [null, "전체"],
                    ["ok", "상품화 가능"],
                    ["not", "안 넘어감 전체"],
                    ...(Object.keys(WHY) as Why[]).map((k) => [k, WHY[k]]),
                  ] as [string | null, string][]
                ).map(([k, label]) => (
                  <Link
                    key={label}
                    href={href({ why: k })}
                    className={`rounded-full border px-3 py-1 ${
                      (why ?? null) === k ? "border-red-600 bg-red-600 text-white" : k && k !== "ok" ? "bg-red-50 hover:bg-red-100" : "bg-card hover:bg-muted"
                    }`}
                  >
                    {label} <strong>{k === null ? regionList.length : whyCount(k)}</strong>
                  </Link>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                이유는 답사자가 적어 온 개방·상품화 칸으로 판단합니다. 표의 &quot;안 넘어간 이유&quot;와 비고를 같이 보세요.
              </p>
            </div>
          )}

          <p className="text-sm">
            <strong>{scopeLabel}</strong> · {TABS[tab].label} {list.length}건 (전체 {rows.length}건 · {groups.length}개 지역) ·
            번호나 주소를 누르면 상세가 위에 열립니다
          </p>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  {(tab === "leased"
                    ? ["번호", "임대인", "상세 주소", "사건번호", "임차인", "연락처", "보증금", "월세", "임대 기간", "수금일", "중개사", "중개사 연락처", "월 수수료", "비고"]
                    : ["번호", "임대인", "상세 주소", "사건번호", "종류", "개방", "상품화", "우편", "계량기", "현관비번", "비고(관리실)", "답사일", ...(tab === "vacant" ? ["안 넘어간 이유"] : [])]
                  ).map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const i = latest(r.auction_inspection);
                  const cells =
                    tab === "leased"
                      ? [
                          r.tenant_name ?? "-",
                          r.tenant_phone ?? "-",
                          won(r.deposit),
                          won(r.monthly_rent),
                          period(r),
                          r.rent_due_day ? `${r.rent_due_day}일` : "-",
                          r.broker_name ?? "-",
                          r.broker_phone ?? "-",
                          won(Math.round((r.monthly_rent ?? 0) * ((r.management_fee_rate ?? 0) / 100))),
                          r.survey_memo ?? "",
                        ]
                      : [
                          r.category ?? "-",
                          CAN_OPEN[i?.can_open ?? ""] ?? "-",
                          MERCH[i?.merchandising_ready ?? ""] ?? "-",
                          r.meter_check?.mail ?? "-",
                          r.meter_check?.meter ?? "-",
                          r.door_code ?? "-",
                          r.survey_memo ?? "",
                          r.survey_date ?? "-",
                          ...(tab === "vacant" ? [whyOf.get(r.id) ? WHY[whyOf.get(r.id)!] : "✓ 상품화 가능"] : []),
                        ];
                  return (
                    <tr key={r.id} className={`border-t align-top hover:bg-muted/40 ${r.id === sp.id ? "bg-yellow-50" : ""}`}>
                      <td className="px-2 py-1.5 font-mono">
                        <Link href={href({ id: r.id })} className="underline">
                          {r.property_no ?? "-"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">{r.owner_name ?? "-"}</td>
                      <td className="px-2 py-1.5">
                        <Link href={href({ id: r.id })} className="hover:underline">
                          {r.address}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono">{r.case_number}</td>
                      {cells.map((c, n) => (
                        <td key={n} className={`px-2 py-1.5 ${n === (tab === "leased" ? 9 : 6) ? "" : "whitespace-nowrap"} ${tab === "vacant" && n === 8 && whyOf.get(r.id) ? "font-semibold text-red-700" : ""}`}>
                          {c}
                        </td>
                      ))}
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
