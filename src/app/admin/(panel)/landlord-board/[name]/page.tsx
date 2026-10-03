import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { loadSheetSnapshot, sheetConfigured } from "@/lib/sheet/source";
import { loadLedgers } from "@/lib/sheet/ledgers";
import { man, unitHref, won } from "@/lib/sheet/links";
import type { SheetUnit } from "@/lib/sheet/all-parser";
import { MonthChips } from "../../rent-board/board-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  return { title: `임대인 ${decodeURIComponent((await params).name)}` };
}

const STATUS_ORDER = ["입주", "상품", "예정", "보류", "삼삼엠투", "미정", "종결"];

export default async function LandlordDetailPage({ params }: { params: Promise<{ name: string }> }) {
  if (!sheetConfigured()) notFound();
  const name = decodeURIComponent((await params).name);
  const [snap, ledgers] = await Promise.all([loadSheetSnapshot(), loadLedgers()]);
  const units = snap.units.filter((u) => u.landlord === name);
  const lr = ledgers.find((l) => l.landlord === name);
  if (units.length === 0 && !lr) notFound();
  const ledger = lr?.ledger;

  const occ = units.filter((u) => u.status === "입주");
  const owing = occ.filter((u) => u.unpaidAmount > 0);
  const byBuilding = new Map<string, SheetUnit[]>();
  for (const u of units) byBuilding.set(u.building, [...(byBuilding.get(u.building) ?? []), u]);

  const totalIn = ledger?.entries.reduce((s, e) => s + e.income, 0) ?? 0;
  const sheetIn = ledger?.summary.find((s) => s.label.replace(/\s/g, "") === "입금총계")?.value;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl space-y-6">
      <div>
        <Link href="/admin/landlord-board" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />임대인 목록
        </Link>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">{name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lr ? `정산 방식: ${lr.rule}` : "임대인 장부 탭 없음"} · ALL 탭 기준일 {snap.sheetDate}
          {ledger?.asOfText && ` · 장부 ${ledger.asOfText}`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="입주 · 공실 · 예정" value={`${occ.length} · ${units.filter((u) => u.status === "상품").length} · ${units.filter((u) => u.status === "예정").length}`} />
        <Kpi label="한 달 월세 합계" value={man(occ.reduce((s, u) => s + u.rent, 0))} />
        <Kpi label="미납" value={`${owing.length}세대 · ${man(owing.reduce((s, u) => s + u.unpaidAmount, 0))}`} red={owing.length > 0} />
        <Kpi label="장부 거래 입금 합계" value={ledger ? man(totalIn) : "-"} />
        <Kpi label="시트 요약 '입금총계'" value={sheetIn !== undefined ? man(sheetIn) : "-"}
          note={sheetIn !== undefined && ledger && Math.abs(sheetIn - totalIn) > 1000 ? "거래 합계와 다름 — 시트 합계 수식 범위 확인 필요" : undefined} />
      </div>

      {lr?.error && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">장부 탭({lr.tab})을 읽지 못했습니다: {lr.error}</div>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">건물 · 호실 <span className="text-sm font-normal text-muted-foreground">· 호수를 누르면 호실 상세</span></h2>
        {[...byBuilding.entries()].map(([b, list]) => (
          <div key={b} className="rounded-xl border overflow-x-auto">
            <div className="px-3 py-2 bg-muted/40 text-sm font-semibold flex flex-wrap gap-x-3">
              <span>{b}</span>
              <span className="font-normal text-muted-foreground">{list[0]?.address}</span>
              <span className="font-normal text-muted-foreground">
                입주 {list.filter((u) => u.status === "입주").length} · 공실 {list.filter((u) => u.status === "상품").length} · 전체 {list.length}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[...list]
                  .sort((x, y) => STATUS_ORDER.indexOf(x.status) - STATUS_ORDER.indexOf(y.status) || x.unit.localeCompare(y.unit, "ko", { numeric: true }))
                  .map((u) => (
                    <tr key={u.key} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link href={unitHref(u.key)} className="font-semibold text-primary hover:underline">{u.unit}호</Link>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{u.status}</td>
                      <td className="px-3 py-2">{u.tenant || "-"}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">{u.rent ? won(u.rent) : "-"}</td>
                      <td className="px-3 py-2">{u.status === "입주" && <MonthChips months={u.months} />}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {u.unpaidAmount > 0 && <span className="text-red-700 font-semibold">{u.unpaidMonths.length}개월 · {won(u.unpaidAmount)}</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
        {byBuilding.size === 0 && <p className="text-sm text-muted-foreground">ALL 탭에 이 임대인의 호실이 없습니다.</p>}
      </section>

      {ledger && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">월별 장부 <span className="text-sm font-normal text-muted-foreground">· {lr?.tab} 탭 · 월을 누르면 거래 내역</span></h2>
          <div className="rounded-xl border overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[90px_repeat(6,1fr)] gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground text-right">
                <span className="text-left">월</span><span>수입</span><span>지출</span><span>차액</span><span>보증금 받음</span><span>보증금 돌려줌</span><span>임대인 지급</span>
              </div>
              {ledger.months.map((m) => (
                <details key={m.ym} className="border-t">
                  <summary className="grid grid-cols-[90px_repeat(6,1fr)] gap-2 px-3 py-2 text-sm text-right tabular-nums cursor-pointer hover:bg-muted/30 list-none">
                    <span className="text-left font-medium">{m.ym === "날짜없음" ? "날짜 없음" : m.ym.replace("-", ".")}</span>
                    <span>{won(m.income)}</span><span>{won(m.expense)}</span>
                    <span className={m.income - m.expense < 0 ? "text-red-700" : "font-semibold"}>{won(m.income - m.expense)}</span>
                    <span className="text-muted-foreground">{m.depositIn ? won(m.depositIn) : "-"}</span>
                    <span className="text-muted-foreground">{m.depositOut ? won(m.depositOut) : "-"}</span>
                    <span className="text-blue-700">{m.payout ? won(m.payout) : "-"}</span>
                  </summary>
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {m.byAccount.map((a) => (
                        <span key={a.account} className="rounded-md border px-2 py-0.5">
                          {a.account} {a.income ? `+${a.income.toLocaleString("ko-KR")}` : ""}{a.expense ? ` −${a.expense.toLocaleString("ko-KR")}` : ""}
                        </span>
                      ))}
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {ledger.entries.filter((e) => (e.ym ?? "날짜없음") === m.ym).map((e) => (
                          <tr key={e.row} className="border-t">
                            <td className="py-1 pr-2 whitespace-nowrap text-muted-foreground">{e.dateText}</td>
                            <td className="py-1 pr-2 whitespace-nowrap">{e.building} {e.unit}</td>
                            <td className="py-1 pr-2 whitespace-nowrap">{e.account}</td>
                            <td className="py-1 pr-2">{e.memo}</td>
                            <td className="py-1 pr-2 text-muted-foreground">{e.tenant}</td>
                            <td className="py-1 text-right tabular-nums whitespace-nowrap">
                              {e.income ? <span className="text-emerald-700">+{e.income.toLocaleString("ko-KR")}</span> : <span className="text-red-700">−{e.expense.toLocaleString("ko-KR")}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          </div>

          {ledger.summary.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">시트 요약 블록 <span className="font-normal text-muted-foreground">(차장님이 시트에 계산해 둔 값 그대로)</span></h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ledger.summary.map((s) => (
                  <div key={s.label} className="rounded-lg border px-3 py-2">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="font-semibold tabular-nums">{Math.abs(s.value) < 1000 ? s.value : won(s.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, red, note }: { label: string; value: string; red?: boolean; note?: string }) {
  return (
    <div className={`rounded-xl border p-3 bg-background ${red ? "border-red-200 bg-red-50/60" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${red ? "text-red-700" : ""}`}>{value}</div>
      {note && <div className="text-[11px] text-amber-700 mt-0.5">{note}</div>}
    </div>
  );
}
