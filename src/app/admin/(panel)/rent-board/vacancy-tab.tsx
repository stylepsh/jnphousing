"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SheetUnit } from "@/lib/sheet/all-parser";

/**
 * 공실·문개방·퇴실/만기·입주예정·보류 — 전부 시트(ALL 탭)에서 계산한다. 시트가 바뀌면 5분 안에 따라 바뀐다.
 * 강제개문은 계약자 칸 초록(movedOut) 또는 메모·최근 월별 칸의 "문개방/강제개방/도어교체/단전단수" 글자로 잡는다.
 */

const FORCED_RE = /문개방|강제개방|강재개방|강제개문|도어교체|단전단수|명도/;
const MOVEOUT_RE = /퇴실\s*예정|퇴실\s*협의|퇴거\s*예정/;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400_000);

/** 가장 최근 월 칸에 적힌 글자 (퇴실·공실·계약 같은 사건 기록) */
function lastNote(u: SheetUnit): string {
  for (let i = u.months.length - 1; i >= 0; i--) {
    const m = u.months[i];
    const t = [m.dateText, m.state === "paid" ? "" : m.amountText].filter(Boolean).join(" ");
    if (t && m.state !== "upcoming") return `${Number(m.ym.slice(5))}월: ${t}`;
  }
  return "";
}

const forcedText = (u: SheetUnit) =>
  [u.memo, u.note, ...u.months.slice(-3).flatMap((m) => [m.dateText, m.amountText])].filter((t) => FORCED_RE.test(t)).join(" · ");

export function VacancyTab({ units, today }: { units: SheetUnit[]; today: string }) {
  const d = useMemo(() => {
    const occupied = units.filter((u) => u.status === "입주");
    const vacant = units.filter((u) => u.status === "상품");
    const forced = occupied.filter((u) => u.movedOut || forcedText(u) !== "").sort((a, b) => b.unpaidAmount - a.unpaidAmount);
    const moving = occupied
      .filter((u) => {
        if (forced.includes(u)) return false;
        const soon = !!u.expiry && u.expiry >= today && daysBetween(today, u.expiry) <= 30;
        return soon || MOVEOUT_RE.test(`${u.memo} ${u.note} ${lastNote(u)}`);
      })
      .sort((a, b) => (a.expiry || "9999").localeCompare(b.expiry || "9999"));
    const incoming = units.filter((u) => u.status === "예정");
    const hold = units.filter((u) => u.status === "보류");
    return { occupied, vacant, forced, moving, incoming, hold };
  }, [units, today]);

  const base = d.occupied.length + d.vacant.length;
  const rate = base > 0 ? Math.round((d.vacant.length / base) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="공실(상품)" value={`${d.vacant.length}호`} sub={`공실률 ${rate}% (입주+상품 기준)`} tone="amber" />
        <Stat label="강제개문·퇴거" value={`${d.forced.length}세대`} sub={`미회수 ${won(d.forced.reduce((s, u) => s + u.unpaidAmount, 0))}`} tone="red" />
        <Stat label="퇴실 예정·30일 내 만기" value={`${d.moving.length}세대`} sub="곧 공실이 될 호실" tone="violet" />
        <Stat label="입주 예정" value={`${d.incoming.length}호`} sub="시트 구분 '예정'" />
        <Stat label="보류" value={`${d.hold.length}호`} sub="상품 제외·직접관리 등" />
      </div>

      <Section title="강제개문·퇴거" hint="계약자 칸 초록 또는 메모에 문개방·도어교체·단전단수" tone="text-red-700">
        <Table
          rows={d.forced}
          cols={[
            ["호실", (u) => <b>{u.building} {u.unit}</b>],
            ["임차인", (u) => u.tenant || "-"],
            ["임대인", (u) => u.landlord],
            ["보증금", (u) => won(u.deposit)],
            ["밀린 월세", (u) => <span className="text-red-700 font-semibold">{u.unpaidMonths.length}개월 · {won(u.unpaidAmount)}</span>],
            ["시트 기록", (u) => <span className="text-muted-foreground">{forcedText(u) || u.memo || "-"}</span>],
          ]}
        />
      </Section>

      <Section title="공실 (상품)" hint="지금 비어 있어 내놓은 호실" tone="text-amber-700">
        <Table
          rows={[...d.vacant].sort((a, b) => a.building.localeCompare(b.building) || a.unit.localeCompare(b.unit, "ko", { numeric: true }))}
          cols={[
            ["호실", (u) => <b>{u.building} {u.unit}</b>],
            ["임대인", (u) => u.landlord],
            ["조건", (u) => (u.rent ? `${won(u.deposit)} / ${won(u.rent)}${u.fee ? ` / 관리비 ${won(u.fee)}` : ""}` : "-")],
            ["마지막 기록", (u) => <span className="text-muted-foreground">{lastNote(u) || "-"}</span>],
            ["메모", (u) => <span className="text-muted-foreground">{u.memo || u.note || "-"}</span>],
          ]}
        />
      </Section>

      <Section title="퇴실 예정 · 30일 안에 만기" hint="메모의 '퇴실 예정/협의' 또는 만료일 30일 이내" tone="text-violet-700">
        <Table
          rows={d.moving}
          cols={[
            ["호실", (u) => <b>{u.building} {u.unit}</b>],
            ["임차인", (u) => u.tenant || "-"],
            ["만료일", (u) => (u.expiry ? `${u.expiry} (${daysBetween(today, u.expiry)}일 남음)` : "-")],
            ["미납", (u) => (u.unpaidAmount ? <span className="text-red-700">{won(u.unpaidAmount)}</span> : "-")],
            ["시트 기록", (u) => <span className="text-muted-foreground">{[u.memo, lastNote(u)].filter(Boolean).join(" · ") || "-"}</span>],
          ]}
        />
      </Section>

      <Section title="입주 예정" hint="시트 구분 '예정' (아직 운영 전 건물 포함)">
        <Table
          rows={d.incoming}
          collapsedAfter={15}
          cols={[
            ["호실", (u) => <b>{u.building} {u.unit}</b>],
            ["임대인", (u) => u.landlord],
            ["예정자", (u) => u.tenant || "-"],
            ["입주일", (u) => u.moveIn || "-"],
            ["메모", (u) => <span className="text-muted-foreground">{u.memo || "-"}</span>],
          ]}
        />
      </Section>

      <Section title="보류" hint="상품에서 뺀 호실">
        <Table
          rows={d.hold}
          cols={[
            ["호실", (u) => <b>{u.building} {u.unit}</b>],
            ["임대인", (u) => u.landlord],
            ["메모", (u) => <span className="text-muted-foreground">{[u.tenant, u.memo].filter(Boolean).join(" · ") || "-"}</span>],
          ]}
        />
      </Section>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "red" | "amber" | "violet" }) {
  return (
    <div className={cn("rounded-xl border p-3 bg-background",
      tone === "red" && "border-red-200 bg-red-50/60",
      tone === "amber" && "border-amber-200 bg-amber-50/60",
      tone === "violet" && "border-violet-200 bg-violet-50/60")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Section({ title, hint, tone, children }: { title: string; hint: string; tone?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={cn("text-base font-semibold mb-2", tone)}>
        {title} <span className="text-muted-foreground font-normal text-sm">· {hint}</span>
      </h2>
      {children}
    </section>
  );
}

type Col = [string, (u: SheetUnit) => React.ReactNode];

function Rows({ rows, cols }: { rows: SheetUnit[]; cols: Col[] }) {
  return (
    <>
      {rows.map((u) => (
        <tr key={u.key} className="border-t align-top">
          {cols.map(([h, f]) => <td key={h} className="px-3 py-2">{f(u)}</td>)}
        </tr>
      ))}
    </>
  );
}

function Table({ rows, cols, collapsedAfter }: { rows: SheetUnit[]; cols: Col[]; collapsedAfter?: number }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">해당 호실 없음</p>;
  const cut = collapsedAfter && rows.length > collapsedAfter ? collapsedAfter : rows.length;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>{cols.map(([h]) => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody><Rows rows={rows.slice(0, cut)} cols={cols} /></tbody>
      </table>
      {cut < rows.length && (
        <details className="border-t">
          <summary className="px-3 py-2 text-sm text-muted-foreground cursor-pointer">나머지 {rows.length - cut}호 더 보기</summary>
          <table className="w-full text-sm"><tbody><Rows rows={rows.slice(cut)} cols={cols} /></tbody></table>
        </details>
      )}
    </div>
  );
}
