"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Phone, RefreshCw, Search, ChevronDown, ChevronUp, Trash2, AlertTriangle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MonthCell, SheetUnit } from "@/lib/sheet/all-parser";
import { addCallLog, assignUnits, deleteCallLog, refreshSheet } from "./actions";
import { VacancyTab } from "./vacancy-tab";
import { landlordHref, unitHref } from "@/lib/sheet/links";

export interface CallLog {
  id: string;
  unit_key: string;
  outcome: Outcome;
  promise_date: string | null;
  memo: string | null;
  author_name: string | null;
  created_at: string;
}
export interface Assignment { unit_key: string; assignee_id: string; assignee_name: string | null }
export interface Staff { id: string; name: string }

type Outcome = "called" | "no_answer" | "promised" | "moving_out" | "other";
const OUTCOME: Record<Outcome, string> = {
  called: "통화함",
  no_answer: "안 받음",
  promised: "입금 약속",
  moving_out: "퇴실 예정",
  other: "기타",
};
const OUTCOME_STYLE: Record<Outcome, string> = {
  called: "bg-emerald-50 text-emerald-800 border-emerald-200",
  no_answer: "bg-slate-100 text-slate-700 border-slate-300",
  promised: "bg-blue-50 text-blue-800 border-blue-200",
  moving_out: "bg-violet-50 text-violet-800 border-violet-200",
  other: "bg-muted text-foreground border-border",
};

type Tab = "call" | "vacancy" | "building" | "all";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const man = (n: number) => (n >= 10000 ? `${Math.round(n / 10000).toLocaleString("ko-KR")}만원` : won(n));
const ymLabel = (ym: string) => `${Number(ym.slice(5))}월`;
const dayLabel = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;
// 서버(Node)와 브라우저의 로케일 출력이 달라 하이드레이션이 깨지므로 직접 만든다. KST 고정.
const fmtDate = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
const kstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
const paidIn = (list: SheetUnit[], ym: string) =>
  list.reduce((s, u) => s + (u.months.find((m) => m.ym === ym && m.state === "paid")?.amount ?? 0), 0);
// 미납 많은 순: 미납 개월 → 금액
const byArrears = (a: SheetUnit, b: SheetUnit) => b.unpaidMonths.length - a.unpaidMonths.length || b.unpaidAmount - a.unpaidAmount;

const TIERS = [
  { key: "urgent", title: "긴급 · 3개월 이상 미납", tone: "border-red-300 bg-red-50 text-red-800", test: (n: number) => n >= 3 },
  { key: "two", title: "주의 · 2개월 미납", tone: "border-orange-300 bg-orange-50 text-orange-800", test: (n: number) => n === 2 },
  { key: "one", title: "1개월 미납", tone: "border-amber-200 bg-amber-50 text-amber-800", test: (n: number) => n === 1 },
  { key: "part", title: "일부만 입금 (차액 미납)", tone: "border-slate-200 bg-slate-50 text-slate-700", test: (n: number) => n === 0 },
] as const;

interface RowCtx {
  logsByUnit: Map<string, CallLog[]>;
  assignByUnit: Map<string, Assignment>;
  staff: Staff[];
  today: string;
  selected: Set<string>;
  toggle: (key: string) => void;
}

export function RentBoardClient({
  units, logs, logsMissing, assignments, assignMissing, staff, me, today, sheetDate, fetchedAt,
}: {
  units: SheetUnit[];
  logs: CallLog[];
  logsMissing: boolean;
  assignments: Assignment[];
  assignMissing: boolean;
  staff: Staff[];
  me: Staff | null;
  today: string;
  sheetDate: string;
  fetchedAt: string;
}) {
  const [tab, setTab] = useState<Tab>("call");
  const [q, setQ] = useState("");
  const [landlord, setLandlord] = useState("");
  const [building, setBuilding] = useState("");
  const [who, setWho] = useState("all"); // all | mine | none | 직원 id
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTo, setBulkTo] = useState("");
  const [pending, startTransition] = useTransition();

  const curYm = today.slice(0, 7);
  const [cy, cm] = curYm.split("-").map(Number);
  const prevYm = cm === 1 ? `${cy - 1}-12` : `${cy}-${String(cm - 1).padStart(2, "0")}`;

  const logsByUnit = useMemo(() => {
    const m = new Map<string, CallLog[]>();
    for (const l of logs) m.set(l.unit_key, [...(m.get(l.unit_key) ?? []), l]);
    return m;
  }, [logs]);
  const assignByUnit = useMemo(() => new Map(assignments.map((a) => [a.unit_key, a])), [assignments]);
  const landlords = useMemo(() => [...new Set(units.map((u) => u.landlord).filter(Boolean))], [units]);

  const filtered = useMemo(() => {
    const t = q.replace(/\s/g, "").toLowerCase();
    return units.filter((u) => {
      if (landlord && u.landlord !== landlord) return false;
      if (building && u.building !== building) return false;
      // 같은 사람이 계정을 둘 가진 경우가 있어 담당 비교는 이름으로 한다
      const a = assignByUnit.get(u.key)?.assignee_name;
      if (who === "mine" && a !== me?.name) return false;
      if (who === "none" && a) return false;
      if (who !== "all" && who !== "mine" && who !== "none" && a !== staff.find((x) => x.id === who)?.name) return false;
      if (!t) return true;
      return [u.building, u.unit, u.tenant, u.landlord, u.address, u.phoneText.replace(/\D/g, "")]
        .some((s) => s.replace(/\s/g, "").toLowerCase().includes(t));
    });
  }, [units, q, landlord, building, who, assignByUnit, me, staff]);

  const occupied = units.filter((u) => u.status === "입주");
  const arrears = occupied.filter((u) => u.unpaidAmount > 0);
  const arrearsTotal = arrears.reduce((s, u) => s + u.unpaidAmount, 0);

  // 전화할 곳: 약속일이 아직 안 지났으면 "약속 대기", 계약자 초록이면 "퇴거·문개방"
  const groups = useMemo(() => {
    const list = filtered.filter((u) => u.status === "입주" && u.unpaidAmount > 0).sort(byArrears);
    const todo: SheetUnit[] = [], waiting: SheetUnit[] = [], movedOut: SheetUnit[] = [];
    for (const u of list) {
      const last = logsByUnit.get(u.key)?.[0];
      if (u.movedOut) movedOut.push(u);
      else if (last?.promise_date && last.promise_date >= today && (last.outcome === "promised" || last.outcome === "moving_out")) waiting.push(u);
      else todo.push(u);
    }
    return { todo, waiting, movedOut };
  }, [filtered, logsByUnit, today]);

  const calledToday = groups.todo.filter((u) => {
    const last = logsByUnit.get(u.key)?.[0];
    return last && kstDay(last.created_at) === today;
  }).length;

  const toggle = (key: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const rowCtx: RowCtx = { logsByUnit, assignByUnit, staff, today, selected, toggle };

  function refresh() {
    startTransition(async () => {
      const r = await refreshSheet();
      if (r.ok) toast.success("시트를 다시 읽었습니다.");
      else toast.error(r.error);
    });
  }
  function bulkAssign() {
    startTransition(async () => {
      const r = await assignUnits([...selected], bulkTo);
      if (r.ok) { toast.success(`${selected.size}세대 담당을 바꿨습니다.`); setSelected(new Set()); }
      else toast.error(r.error);
    });
  }

  const tierSum = (test: (n: number) => boolean) => {
    const l = arrears.filter((u) => test(u.unpaidMonths.length));
    return { n: l.length, amt: l.reduce((s, u) => s + u.unpaidAmount, 0) };
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임대 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            경리 구글 시트(ALL 탭) 자동 연동 · 시트에 적힌 기준일 {sheetDate || "-"} · 마지막으로 읽은 시각 {fmtDate(fetchedAt)} (5분마다 자동)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={pending}>
          <RefreshCw className={cn("h-4 w-4 mr-1.5", pending && "animate-spin")} />
          지금 새로고침
        </Button>
      </div>

      {(logsMissing || assignMissing) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Supabase SQL Editor 에서 {logsMissing && <code className="font-mono">045_rent_call_logs.sql </code>}
          {assignMissing && <code className="font-mono">046_rent_assignments.sql</code>} 을 실행하세요.
        </div>
      )}

      {/* 받을 돈 — 언제 기준인지 같이 보여준다 */}
      <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-sm text-red-900/80">받을 돈 (밀린 월세)</div>
            <div className="text-3xl font-bold text-red-700 tabular-nums">{won(arrearsTotal)}</div>
          </div>
          <div className="text-sm text-red-900/80 md:text-right">
            <b>{dayLabel(today)} 기준</b> · 납부일이 지났는데 금액 칸이 빈 달만 셈 (관리비 제외)<br />
            미납 {arrears.length}세대 · 이 중 퇴거·문개방 {arrears.filter((u) => u.movedOut).length}세대
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {TIERS.map((t) => {
            const s = tierSum(t.test);
            return (
              <div key={t.key} className={cn("rounded-lg border px-3 py-2", t.tone)}>
                <div className="text-xs">{t.title}</div>
                <div className="font-semibold tabular-nums">{s.n}세대 · {man(s.amt)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={`${ymLabel(prevYm)} 들어온 월세`} value={man(paidIn(occupied, prevYm))} />
        <Kpi label={`${ymLabel(curYm)} 들어온 월세 (${dayLabel(today)}까지)`} value={man(paidIn(occupied, curYm))} />
        <Kpi label="입주 · 한 달 월세 합계" value={`${occupied.length}호 · ${man(occupied.reduce((s, u) => s + u.rent, 0))}`} />
        <Kpi label="상품(공실) · 입주 예정" value={`${units.filter((u) => u.status === "상품").length}호 · ${units.filter((u) => u.status === "예정").length}호`} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border p-0.5 bg-muted/40">
          {([["call", `전화할 곳 ${groups.todo.length}`], ["vacancy", "공실·문개방·변동"], ["building", "건물별 현황"], ["all", "전체 호실"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={cn("px-3 py-1.5 text-sm rounded-md", tab === k ? "bg-background shadow-sm font-semibold" : "text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·건물·호수·전화번호" className="pl-8" />
        </div>
        <select value={landlord} onChange={(e) => { setLandlord(e.target.value); setBuilding(""); }}
          className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="임대인">
          <option value="">임대인 전체</option>
          {landlords.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={who} onChange={(e) => setWho(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="담당자">
          <option value="all">담당 전체</option>
          {me && <option value="mine">내 담당 ({me.name})</option>}
          <option value="none">담당 미배정</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name} 담당</option>)}
        </select>
        {building && (
          <button type="button" onClick={() => setBuilding("")}>
            <Badge variant="secondary">{building} ✕</Badge>
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 shadow-sm text-sm">
          <b>{selected.size}세대 선택</b> → 담당
          <select value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} className="h-8 rounded-md border px-2" aria-label="배정할 직원">
            <option value="">배정 해제</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button size="sm" onClick={bulkAssign} disabled={pending}>적용</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>선택 취소</Button>
        </div>
      )}

      {tab === "call" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            오늘 통화 기록 <b className="text-foreground">{calledToday} / {groups.todo.length}</b>세대 · 미납 개월 많은 순 ·
            왼쪽 네모를 체크하면 여러 세대를 한 번에 담당 지정할 수 있습니다.
          </p>
          {TIERS.map((t) => {
            const list = groups.todo.filter((u) => t.test(u.unpaidMonths.length));
            if (list.length === 0) return null;
            return (
              <section key={t.key}>
                <h2 className={cn("inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-semibold mb-2", t.tone)}>
                  {t.title} <span className="font-normal">{list.length}세대 · {won(list.reduce((s, u) => s + u.unpaidAmount, 0))}</span>
                </h2>
                <div className="space-y-2">{list.map((u) => <UnitRow key={u.key} u={u} ctx={rowCtx} />)}</div>
              </section>
            );
          })}
          <Group title="입금 약속 대기" hint="약속일이 지나면 위로 다시 올라옵니다" units={groups.waiting} ctx={rowCtx} />
          <Group title="퇴거·문개방" hint="시트에서 계약자 칸이 초록인 세대" units={groups.movedOut} ctx={rowCtx} />
          {groups.todo.length + groups.waiting.length + groups.movedOut.length === 0 && (
            <p className="text-sm text-muted-foreground">조건에 맞는 미납 세대가 없습니다.</p>
          )}
        </div>
      )}

      {tab === "vacancy" && <VacancyTab units={filtered} today={today} />}

      {tab === "building" && (
        <BuildingTable units={filtered} curYm={curYm} prevYm={prevYm} onPick={(b) => { setBuilding(b); setTab("all"); }} />
      )}

      {tab === "all" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            종결된 호실도 보기
          </label>
          {filtered.filter((u) => showClosed || u.status !== "종결").map((u) => <UnitRow key={u.key} u={u} ctx={rowCtx} />)}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3 bg-background">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Group({ title, hint, units, ctx }: { title: string; hint: string; units: SheetUnit[]; ctx: RowCtx }) {
  if (units.length === 0) return null;
  return (
    <section>
      <h2 className="text-base font-semibold mb-2">
        {title} <span className="text-muted-foreground font-normal text-sm">{units.length}세대 · {hint}</span>
      </h2>
      <div className="space-y-2">{units.map((u) => <UnitRow key={u.key} u={u} ctx={ctx} />)}</div>
    </section>
  );
}

const STATE_STYLE: Record<MonthCell["state"], string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  unpaid: "bg-red-100 text-red-700 border-red-300 font-semibold",
  review: "bg-amber-100 text-amber-800 border-amber-300",
  upcoming: "bg-background text-muted-foreground border-dashed",
  event: "bg-slate-100 text-slate-600 border-slate-200",
  none: "bg-background text-muted-foreground/40 border-transparent",
};
const STATE_LABEL: Record<MonthCell["state"], string> = {
  paid: "입금", unpaid: "미납", review: "확인 필요", upcoming: "예정", event: "기타", none: "",
};

export function MonthChips({ months }: { months: MonthCell[] }) {
  return (
    <div className="flex gap-1">
      {months.slice(-6).map((m) => (
        <span key={m.ym} title={`${m.ym} ${STATE_LABEL[m.state]} ${m.dateText} ${m.amountText}`.trim()}
          className={cn("text-[11px] leading-none px-1.5 py-1 rounded border tabular-nums", STATE_STYLE[m.state])}>
          {ymLabel(m.ym)}
        </span>
      ))}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  입주: "bg-blue-50 text-blue-700 border-blue-200",
  상품: "bg-amber-50 text-amber-700 border-amber-200",
  예정: "bg-violet-50 text-violet-700 border-violet-200",
  종결: "bg-slate-100 text-slate-500 border-slate-200",
};

function UnitRow({ u, ctx }: { u: SheetUnit; ctx: RowCtx }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const logs = ctx.logsByUnit.get(u.key) ?? [];
  const last = logs[0];
  const assignee = ctx.assignByUnit.get(u.key);

  function assign(id: string) {
    startTransition(async () => {
      const r = await assignUnits([u.key], id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className={cn("rounded-xl border bg-background", ctx.selected.has(u.key) && "ring-2 ring-primary/40")}>
      <div className="p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <input type="checkbox" checked={ctx.selected.has(u.key)} onChange={() => ctx.toggle(u.key)}
          aria-label="담당 지정할 세대 선택" className="h-4 w-4" />
        <button type="button" onClick={() => setOpen(!open)} className="flex flex-wrap items-center gap-2 text-left min-w-[220px] flex-1">
          <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", STATUS_STYLE[u.status] ?? "bg-muted")}>{u.status}</span>
          <span className="font-semibold">{u.building} {u.unit}</span>
          <span>{u.tenant || "-"}</span>
          <span className="text-xs text-muted-foreground">{u.landlord}</span>
          {u.movedOut && <Badge variant="outline" className="border-green-400 text-green-700">퇴거·문개방</Badge>}
          {u.duplicateRows.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="시트 중복 행" />}
          {open ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
        </button>
        <MonthChips months={u.months} />
        <div className="text-sm tabular-nums min-w-[130px] text-right">
          {u.unpaidAmount > 0
            ? <span className="text-red-700 font-semibold">{u.unpaidMonths.length > 0 ? `${u.unpaidMonths.length}개월` : "차액"} · {won(u.unpaidAmount)}</span>
            : <span className="text-muted-foreground">월 {won(u.rent)}</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {u.phones.map((p) => (
            <a key={p} href={`tel:${p.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
              <Phone className="h-3 w-3" />{p}
            </a>
          ))}
        </div>
      </div>

      {/* 담당 · 마지막으로 누가 무엇을 했는지 */}
      <div className="px-3 pb-2 -mt-1 flex flex-wrap items-center gap-2 text-xs">
        <label className="inline-flex items-center gap-1 text-muted-foreground">
          <UserRound className="h-3.5 w-3.5" />담당
          <select value={ctx.staff.find((x) => x.name === assignee?.assignee_name)?.id ?? ""} onChange={(e) => assign(e.target.value)} disabled={pending}
            className={cn("h-7 rounded-md border px-1.5 text-xs", !assignee && "text-muted-foreground")}>
            <option value="">미배정</option>
            {ctx.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {last ? (
          <span className={cn("rounded-md border px-2 py-0.5", OUTCOME_STYLE[last.outcome])}>
            <b>{last.author_name ?? "?"} {OUTCOME[last.outcome]}</b> · {fmtDate(last.created_at)}
            {last.promise_date && ` · ${last.outcome === "moving_out" ? "퇴실" : "약속"} ${last.promise_date}`}
            {last.promise_date && last.promise_date < ctx.today && <span className="text-red-600"> (지남)</span>}
          </span>
        ) : (
          <span className="rounded-md border border-dashed px-2 py-0.5 text-muted-foreground">아직 아무도 통화 안 함</span>
        )}
        {!open && last?.memo && <span className="text-muted-foreground truncate max-w-[480px]">&ldquo;{last.memo}&rdquo;</span>}
        <span className="ml-auto flex gap-2">
          <Link href={unitHref(u.key)} className="text-primary hover:underline">호실 상세 →</Link>
          <Link href={landlordHref(u.landlord)} className="text-primary hover:underline">{u.landlord} 장부 →</Link>
        </span>
      </div>
      {!open && u.memo && <div className="px-3 pb-2 -mt-1 text-xs text-muted-foreground">경리 메모: {u.memo}</div>}
      {open && <UnitDetail u={u} logs={logs} today={ctx.today} />}
    </div>
  );
}

export function UnitDetail({ u, logs, today }: { u: SheetUnit; logs: CallLog[]; today: string }) {
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<Outcome>("called");
  const formRef = useRef<HTMLFormElement>(null);

  function submit(fd: FormData) {
    startTransition(async () => {
      const r = await addCallLog(fd);
      if (r.ok) { toast.success("기록했습니다."); formRef.current?.reset(); setOutcome("called"); }
      else toast.error(r.error);
    });
  }
  function remove(id: string) {
    if (!confirm("이 기록을 지울까요?")) return;
    startTransition(async () => {
      const r = await deleteCallLog(id);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="border-t p-3 grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-[88px_1fr] gap-y-1">
          <dt className="text-muted-foreground">주소</dt><dd>{u.address || "-"}</dd>
          <dt className="text-muted-foreground">조건</dt><dd>보증금 {won(u.deposit)} · 월세 {won(u.rent)} · 관리비 {won(u.fee)}</dd>
          <dt className="text-muted-foreground">기간</dt>
          <dd>{u.moveIn || "-"} ~ {u.expiry || "-"} {u.expired && <span className="text-amber-700">(만료일 지남)</span>}</dd>
          <dt className="text-muted-foreground">납부</dt><dd>{u.payType || "-"}{u.payDay && ` · 매월 ${u.payDay}일`}</dd>
          <dt className="text-muted-foreground">연락처</dt><dd>{u.phoneText || "-"}</dd>
          {u.memo && <><dt className="text-muted-foreground">경리 메모</dt><dd>{u.memo}</dd></>}
          {u.note && <><dt className="text-muted-foreground">비고</dt><dd>{u.note}</dd></>}
        </dl>
        {u.duplicateRows.length > 0 && (
          <p className="text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-900 p-2">
            시트에 같은 호실이 {u.duplicateRows.length + 1}줄 있습니다 (행 {[...u.duplicateRows, u.row].join(", ")}).
            지금은 맨 아래 {u.row}행을 보여줍니다 — 경리 확인 필요.
          </p>
        )}
        <div>
          <div className="text-xs text-muted-foreground mb-1">월별 입금 (시트에 적힌 그대로)</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
            {u.months.map((m) => (
              <div key={m.ym} className={cn("rounded border px-2 py-1 text-xs", STATE_STYLE[m.state])}>
                <div className="font-medium">{m.ym.slice(2).replace("-", ".")} {STATE_LABEL[m.state]}</div>
                <div className="truncate">{m.dateText || "-"}</div>
                <div className="truncate tabular-nums">{m.amountText}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <form ref={formRef} action={submit} className="space-y-2 rounded-lg border p-3 bg-muted/30">
          <input type="hidden" name="unit_key" value={u.key} />
          <input type="hidden" name="building" value={u.building} />
          <input type="hidden" name="unit" value={u.unit} />
          <input type="hidden" name="tenant_name" value={u.tenant} />
          <div className="text-xs text-muted-foreground">통화 결과 (저장하면 &ldquo;내 이름 + 결과&rdquo;로 모두에게 보입니다)</div>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(OUTCOME) as Outcome[]).map((k) => (
              <label key={k} className={cn("cursor-pointer rounded-md border px-2.5 py-1.5 text-sm", outcome === k && "bg-primary text-primary-foreground border-primary")}>
                <input type="radio" name="outcome" value={k} checked={outcome === k} onChange={() => setOutcome(k)} className="sr-only" />
                {OUTCOME[k]}
              </label>
            ))}
          </div>
          {(outcome === "promised" || outcome === "moving_out") && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{outcome === "promised" ? "입금 약속일" : "퇴실 예정일"}</span>
              <Input type="date" name="promise_date" min={today} className="max-w-[170px]" />
            </div>
          )}
          <Textarea name="memo" rows={5} maxLength={5000}
            placeholder="통화 내용을 자세히 적어 주세요 (예: 본인 통화. 10/15에 8·9월분 150만원 입금 약속, 안 되면 10/20 퇴실 의사 있음)" />
          <Button type="submit" size="sm" disabled={pending}>기록 저장</Button>
        </form>

        <div className="space-y-1.5">
          {logs.length === 0 && <p className="text-xs text-muted-foreground">통화 기록 없음</p>}
          {logs.map((l) => (
            <div key={l.id} className="text-sm rounded-md border px-2.5 py-1.5 flex gap-2">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  {fmtDate(l.created_at)} · <b className="text-foreground">{l.author_name ?? ""} {OUTCOME[l.outcome]}</b>
                  {l.promise_date && <> · {l.promise_date}{l.promise_date < today && <span className="text-red-600"> (지남)</span>}</>}
                </div>
                {l.memo && <div className="whitespace-pre-wrap">{l.memo}</div>}
              </div>
              <button type="button" onClick={() => remove(l.id)} className="text-muted-foreground hover:text-red-600" aria-label="기록 삭제">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BuildingTable({ units, curYm, prevYm, onPick }: {
  units: SheetUnit[]; curYm: string; prevYm: string; onPick: (building: string) => void;
}) {
  const rows = useMemo(() => {
    const m = new Map<string, { landlord: string; building: string; list: SheetUnit[] }>();
    for (const u of units) {
      const k = `${u.landlord}|${u.building}`;
      if (!m.has(k)) m.set(k, { landlord: u.landlord, building: u.building, list: [] });
      m.get(k)!.list.push(u);
    }
    return [...m.values()]
      .map(({ landlord, building, list }) => {
        const occ = list.filter((u) => u.status === "입주");
        const owing = occ.filter((u) => u.unpaidAmount > 0);
        return {
          landlord, building,
          occ: occ.length,
          vacant: list.filter((u) => u.status === "상품").length,
          planned: list.filter((u) => u.status === "예정").length,
          rent: occ.reduce((s, u) => s + u.rent, 0),
          prev: paidIn(occ, prevYm),
          cur: paidIn(occ, curYm),
          owingN: owing.length,
          owing: owing.reduce((s, u) => s + u.unpaidAmount, 0),
        };
      })
      .filter((r) => r.occ + r.vacant + r.planned > 0)
      .sort((a, b) => b.owing - a.owing || b.occ - a.occ);
  }, [units, curYm, prevYm]);

  const sum = (k: "occ" | "vacant" | "rent" | "prev" | "cur" | "owingN" | "owing") => rows.reduce((s, r) => s + r[k], 0);
  const cell = "px-3 py-2 text-right tabular-nums";

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">임대인</th><th className="px-3 py-2 text-left">건물</th>
            <th className={cell}>입주</th><th className={cell}>상품</th><th className={cell}>예정</th>
            <th className={cell}>월세 합계</th><th className={cell}>{ymLabel(prevYm)} 입금</th><th className={cell}>{ymLabel(curYm)} 입금</th>
            <th className={cell}>미납 세대</th><th className={cell}>받을 돈</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.landlord}|${r.building}`} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => onPick(r.building)}>
              <td className="px-3 py-2 text-muted-foreground">{r.landlord}</td>
              <td className="px-3 py-2 font-medium">{r.building}</td>
              <td className={cell}>{r.occ}</td><td className={cell}>{r.vacant}</td><td className={cell}>{r.planned}</td>
              <td className={cell}>{won(r.rent)}</td><td className={cell}>{won(r.prev)}</td><td className={cell}>{won(r.cur)}</td>
              <td className={cn(cell, r.owingN > 0 && "text-red-700 font-semibold")}>{r.owingN}</td>
              <td className={cn(cell, r.owing > 0 && "text-red-700 font-semibold")}>{won(r.owing)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/40 font-semibold">
          <tr>
            <td className="px-3 py-2" colSpan={2}>합계</td>
            <td className={cell}>{sum("occ")}</td><td className={cell}>{sum("vacant")}</td><td />
            <td className={cell}>{won(sum("rent"))}</td><td className={cell}>{won(sum("prev"))}</td><td className={cell}>{won(sum("cur"))}</td>
            <td className={cn(cell, "text-red-700")}>{sum("owingN")}</td><td className={cn(cell, "text-red-700")}>{won(sum("owing"))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
