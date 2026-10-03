import Link from "next/link";
import { loadSheetSnapshot, sheetConfigured } from "@/lib/sheet/source";
import { loadOtherTabs } from "@/lib/sheet/ledgers";
import { findUnitByText, landlordHref, matchLandlord, unitHref, won } from "@/lib/sheet/links";
import type { MoveOut, ReportBlock, StayBooking } from "@/lib/sheet/other-tabs";
import type { SheetUnit } from "@/lib/sheet/all-parser";
import { cn } from "@/lib/utils";

export const metadata = { title: "정산·보고" };
export const dynamic = "force-dynamic";

type Tab = "report" | "moveout" | "stay";
const TABS: [Tab, string][] = [["report", "월 보고서 (임대인별 수익·지급)"], ["moveout", "퇴실정산"], ["stay", "삼삼엠투 단기"]];

export default async function SettleBoardPage({ searchParams }: { searchParams: Promise<{ tab?: string; ym?: string }> }) {
  if (!sheetConfigured()) return <p className="p-8 text-sm">구글 시트 연결이 아직 안 됐습니다.</p>;
  const sp = await searchParams;
  const tab: Tab = sp.tab === "moveout" || sp.tab === "stay" ? sp.tab : "report";
  const [snap, other] = await Promise.all([loadSheetSnapshot(), loadOtherTabs()]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">정산 · 보고</h1>
        <p className="mt-1 text-sm text-muted-foreground">경리 시트의 보고서 · 퇴실정산 · 삼삼엠투 탭을 그대로 읽어 정리했습니다 (5분마다 자동 갱신)</p>
      </div>
      <div className="flex flex-wrap rounded-lg border p-0.5 bg-muted/40 w-fit">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/settle-board?tab=${k}`}
            className={cn("px-3 py-1.5 text-sm rounded-md", tab === k ? "bg-background shadow-sm font-semibold" : "text-muted-foreground")}>
            {label}
          </Link>
        ))}
      </div>

      {tab === "report" && (typeof other.reports === "string"
        ? <Err msg={other.reports} />
        : <Reports blocks={other.reports} ym={sp.ym} landlords={[...new Set(snap.units.map((u) => u.landlord).filter(Boolean))]} />)}
      {tab === "moveout" && (typeof other.moveOuts === "string" ? <Err msg={other.moveOuts} /> : <MoveOuts list={other.moveOuts} units={snap.units} />)}
      {tab === "stay" && (typeof other.stays === "string" ? <Err msg={other.stays} /> : <Stays {...other.stays} />)}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">시트 탭을 읽지 못했습니다: {msg}</div>;
}

// ───────── 월 보고서 ─────────
function Reports({ blocks, ym, landlords }: { blocks: ReportBlock[]; ym?: string; landlords: string[] }) {
  const b = blocks.find((x) => x.ym === ym) ?? blocks[blocks.length - 1];
  if (!b) return <p className="text-sm text-muted-foreground">보고서 블록이 없습니다.</p>;
  const payCol = b.columns.findIndex((c) => c.includes("금월 지급"));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {blocks.map((x) => (
          <Link key={x.row} href={`/admin/settle-board?tab=report&ym=${x.ym}`}
            className={cn("rounded-md border px-2.5 py-1 text-sm", x === b ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}>
            {x.ym?.replace("-", ".")}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        <b className="text-foreground">{b.title}</b> · {b.basis || "기준일 표기 없음"} · 시트 {b.row}행 · 노란 열 = 그 달 임대인에게 줄 돈
      </p>
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left sticky left-0 bg-muted">임대인</th>
              {b.columns.map((c, j) => <th key={j} className={cn("px-3 py-2 text-right", j === payCol && "bg-yellow-100 text-yellow-900")}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, i) => {
              const l = matchLandlord(r.name, landlords);
              return (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium sticky left-0 bg-background">
                    {l ? <Link href={landlordHref(l)} className="text-primary hover:underline">{r.name}</Link> : r.name}
                  </td>
                  {r.cells.map((c, j) => <td key={j} className={cn("px-3 py-2 text-right tabular-nums", j === payCol && "bg-yellow-50 font-semibold")}>{c}</td>)}
                </tr>
              );
            })}
          </tbody>
          {b.total && (
            <tfoot className="border-t bg-muted/40 font-semibold">
              <tr>
                <td className="px-3 py-2 sticky left-0 bg-muted">계</td>
                {b.total.map((c, j) => <td key={j} className="px-3 py-2 text-right tabular-nums">{c}</td>)}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ───────── 퇴실정산 ─────────
function MoveOuts({ list, units }: { list: MoveOut[]; units: SheetUnit[] }) {
  const sorted = [...list].sort((a, b) => Number(b.pending) - Number(a.pending) || b.row - a.row);
  const pending = list.filter((m) => m.pending);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Box label="퇴실정산 전체" value={`${list.length}건`} />
        <Box label="정산 안 끝난 건" value={`${pending.length}건`} tone="amber" />
        <Box label="돌려줄 돈 (미정산 건)" value={won(pending.filter((m) => m.refund > 0).reduce((s, m) => s + m.refund, 0))} />
        <Box label="더 받을 돈 (미정산 건)" value={won(-pending.filter((m) => m.refund < 0).reduce((s, m) => s + m.refund, 0))} tone="red" />
      </div>
      <p className="text-xs text-muted-foreground">미정산 = 시트에 &lsquo;미정산·정산필요·협의·확인&rsquo; 메모가 있거나 계 줄이 없는 건 · 미정산 먼저, 그다음 최근 순 · 누르면 항목별 계산</p>
      <div className="space-y-2">
        {sorted.map((m) => {
          const u = findUnitByText(m.property, units);
          return (
            <details key={m.row} className={cn("rounded-xl border bg-background", m.pending && "border-amber-300")}>
              <summary className="p-3 flex flex-wrap items-center gap-x-4 gap-y-1 cursor-pointer list-none">
                {m.pending && <span className="text-[11px] rounded border border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0.5">미정산</span>}
                <span className="font-semibold">{m.property || "(물건 표기 없음)"}</span>
                <span className="text-xs text-muted-foreground">{m.terms}</span>
                <span>{m.tenant}</span>
                <span className="text-sm text-muted-foreground">{m.period}</span>
                <span className="text-sm">{m.reason}</span>
                <span className={cn("ml-auto font-semibold tabular-nums", m.refund < 0 ? "text-red-700" : "text-emerald-700")}>
                  {m.refund < 0 ? `더 받을 돈 ${won(-m.refund)}` : `돌려줄 돈 ${won(m.refund)}`}
                </span>
              </summary>
              <div className="border-t p-3 space-y-2 text-sm">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr><th className="text-left py-1">구분</th><th className="text-right">받은 돈</th><th className="text-right">사용료 공제</th><th className="text-right">환급</th><th className="text-left pl-3">비고</th></tr>
                  </thead>
                  <tbody>
                    {m.lines.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1">{l.item}</td>
                        <td className="text-right tabular-nums">{l.income ? won(l.income) : ""}</td>
                        <td className="text-right tabular-nums">{l.deduct ? won(l.deduct) : ""}</td>
                        <td className="text-right tabular-nums">{l.refund ? won(l.refund) : ""}</td>
                        <td className="pl-3 text-muted-foreground">{l.note}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-semibold">
                      <td className="py-1">계</td>
                      <td className="text-right tabular-nums">{won(m.totalIn)}</td>
                      <td className="text-right tabular-nums">{won(m.totalDeduct)}</td>
                      <td className="text-right tabular-nums">{won(m.refund)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
                {m.notes.length > 0 && <p className="text-amber-800">메모: {m.notes.join(" · ")}</p>}
                <p className="text-xs text-muted-foreground">
                  시트 퇴실정산 탭 {m.row}행
                  {u && <> · <Link href={unitHref(u.key)} className="text-primary hover:underline">{u.building} {u.unit}호 상세 →</Link></>}
                </p>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ───────── 삼삼엠투 ─────────
function Stays({ bookings, summary }: { bookings: StayBooking[]; summary: { label: string; value: number }[] }) {
  const byUnit = new Map<string, StayBooking[]>();
  for (const b of bookings) {
    const k = `${b.building} ${b.unit}`;
    byUnit.set(k, [...(byUnit.get(k) ?? []), b]);
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.slice(0, 4).map((s) => <Box key={s.label} label={s.label} value={Math.abs(s.value) < 1000 ? String(s.value) : won(s.value)} />)}
      </div>
      <p className="text-xs text-muted-foreground">호실 하나에 1~2주 단위 연장이 줄줄이 붙는 구조라 호실별로 묶었습니다 · 예약 {bookings.length}건 · 호실 {byUnit.size}개</p>
      {[...byUnit.entries()].map(([k, list]) => (
        <div key={k} className="rounded-xl border overflow-x-auto">
          <div className="px-3 py-2 bg-muted/40 text-sm flex flex-wrap gap-x-4">
            <b>{k}</b>
            <span className="text-muted-foreground">{list[0].landlord}</span>
            <span className="text-muted-foreground">{list.length}건 · 입금 {won(list.reduce((s, b) => s + b.paid, 0))} · 정산후 수익 {won(list.reduce((s, b) => s + b.profit, 0))}</span>
          </div>
          <table className="w-full text-sm whitespace-nowrap">
            <tbody>
              {list.map((b) => (
                <tr key={b.row} className="border-t">
                  <td className="px-3 py-1.5 text-xs">{b.status}</td>
                  <td className="px-3 py-1.5">{b.guest}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{b.start}{b.end && ` ~ ${b.end}`}</td>
                  <td className="px-3 py-1.5">{b.term}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{b.amount ? won(b.amount) : ""}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700">{b.paid ? `입금 ${won(b.paid)}` : ""}</td>
                  <td className="px-3 py-1.5 text-muted-foreground max-w-[320px] truncate">{b.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: "amber" | "red" }) {
  return (
    <div className={cn("rounded-xl border p-3 bg-background", tone === "amber" && "border-amber-200 bg-amber-50/60", tone === "red" && "border-red-200 bg-red-50/60")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
