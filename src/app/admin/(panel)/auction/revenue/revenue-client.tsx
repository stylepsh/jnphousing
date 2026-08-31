"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, AlertTriangle, CalendarClock, Plus, RefreshCw } from "lucide-react";
import { formatWon } from "@/lib/money";
import {
  calcRecovery,
  monthlyFeeOf,
  leaseAlertOf,
  daysUntil,
  overdueDays,
} from "@/lib/auction/revenue";
import {
  generateReceipts,
  saveReceipt,
  saveLeaseTerms,
  addWorkCost,
  type RevenueProperty,
  type ReceiptRow,
} from "./actions";

const COST_CATEGORIES = [
  { key: "repair", label: "수리·인테리어" },
  { key: "wallpaper", label: "도배" },
  { key: "flooring", label: "바닥" },
  { key: "cleaning", label: "청소" },
  { key: "key", label: "열쇠개문" },
  { key: "brokerage", label: "부동산 중개수수료" },
  { key: "maintenance", label: "공실 관리비" },
  { key: "appliance", label: "가전" },
  { key: "etc", label: "기타" },
];

const inputCls =
  "w-full px-2 py-1.5 rounded border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";

export function RevenueClient({
  properties,
  receipts,
  period,
  trend,
}: {
  properties: RevenueProperty[];
  receipts: ReceiptRow[];
  period: string;
  trend: { period: string; expected: number; received: number; count: number }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [simRate, setSimRate] = useState(40);
  const [openId, setOpenId] = useState<string | null>(null);

  const receiptBy = useMemo(() => {
    const m = new Map<string, ReceiptRow>();
    for (const r of receipts) m.set(r.auction_property_id, r);
    return m;
  }, [receipts]);

  const rows = useMemo(
    () =>
      properties.map((p) => {
        const monthlyFee = monthlyFeeOf(p.monthly_rent, p.management_fee_rate);
        // 실제 수납액 기준 수수료 누계 (추정보다 정확)
        const cumulativeIncome = Math.round(p.receivedTotal * ((p.management_fee_rate ?? 0) / 100));
        const rec = calcRecovery({
          fieldTeamCost: p.fieldTeamCost,
          cumulativeIncome,
          monthlyFee,
          shareRate: p.profit_share_rate ?? 0,
        });
        const sim = calcRecovery({
          fieldTeamCost: p.fieldTeamCost,
          cumulativeIncome,
          monthlyFee,
          shareRate: simRate,
        });
        const receipt = receiptBy.get(p.id);
        return {
          p,
          monthlyFee,
          rec,
          sim,
          receipt,
          alert: leaseAlertOf(p.lease_end),
          dday: daysUntil(p.lease_end),
          overdue: receipt ? overdueDays(receipt.due_date, receipt.received) : 0,
        };
      }),
    [properties, receiptBy, simRate],
  );

  const kpi = useMemo(() => {
    const expected = receipts.reduce((s, r) => s + (r.expected ?? 0), 0);
    const received = receipts.reduce((s, r) => s + (r.received ?? 0), 0);
    const unpaidCount = receipts.filter((r) => (r.received ?? 0) === 0).length;
    const invested = rows.reduce((s, r) => s + r.p.fieldTeamCost, 0);
    const remaining = rows.reduce((s, r) => s + r.rec.remaining, 0);
    const share = rows.reduce((s, r) => s + r.sim.fieldTeamShare, 0);
    const company = rows.reduce((s, r) => s + r.sim.companyShare, 0);
    return {
      expected,
      received,
      unpaid: expected - received,
      unpaidCount,
      invested,
      remaining,
      share,
      company,
    };
  }, [receipts, rows]);

  const alerts = rows.filter((r) => r.alert !== "none" || r.overdue > 0);

  function makeReceipts() {
    startTransition(async () => {
      const res = await generateReceipts(period);
      if (!res.ok) {
        toast.error(res.error ?? "생성 실패");
        return;
      }
      toast.success(
        res.created ? `${period} 청구 ${res.created}건 생성` : "이미 전부 생성돼 있습니다",
      );
      router.refresh();
    });
  }

  function markPaid(propertyId: string, amount: number) {
    startTransition(async () => {
      const res = await saveReceipt({ propertyId, period, received: amount });
      if (!res.ok) {
        toast.error(res.error ?? "저장 실패");
        return;
      }
      toast.success("수납 처리");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label={`${period} 예상 수입`} value={formatWon(kpi.expected)} sub={`${receipts.length}건`} />
        <Kpi label="실수령" value={formatWon(kpi.received)} tone="emerald" />
        <Kpi
          label="미납"
          value={formatWon(Math.max(0, kpi.unpaid))}
          sub={`${kpi.unpaidCount}건`}
          tone={kpi.unpaid > 0 ? "rose" : undefined}
        />
        <Kpi
          label="미회수 투입비"
          value={formatWon(kpi.remaining)}
          sub={`총 투입 ${formatWon(kpi.invested)}`}
          tone="amber"
        />
      </div>

      <div className="rounded-xl border bg-card p-4 flex items-center gap-3 flex-wrap">
        <CalendarClock className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold">{period} 청구</span>
        <span className="text-xs text-muted-foreground">
          임대중 물건마다 예정액·수금일을 만들어 둡니다. 이미 있는 건은 건드리지 않습니다.
        </span>
        <button
          onClick={makeReceipts}
          disabled={pending}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" /> 이번 달 청구 생성
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4" /> 확인 필요 {alerts.length}건
          </p>
          <ul className="space-y-1.5 text-sm">
            {alerts.slice(0, 12).map(({ p, alert, dday, overdue }) => (
              <li key={p.id} className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{p.address}</span>
                {alert === "expired" && (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    만기 지남 {dday !== null ? `${-dday}일` : ""}
                  </span>
                )}
                {alert === "d30" && (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    만기 {dday}일 전 — 답사팀에 안내
                  </span>
                )}
                {alert === "d60" && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    만기 {dday}일 전
                  </span>
                )}
                {overdue > 0 && (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    월세 연체 {overdue}일
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-blue-600" /> 배분율 시뮬레이션
          <span className="font-normal text-xs text-muted-foreground">
            — 투입비 회수가 끝난 분에 대해서만 배분됩니다
          </span>
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {[30, 40, 50].map((r) => (
            <button
              key={r}
              onClick={() => setSimRate(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                simRate === r
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-background text-blue-700 border-blue-200 hover:bg-blue-50"
              }`}
            >
              현장팀 {r}%
            </button>
          ))}
          <div className="ml-auto text-sm">
            현장팀 <strong className="text-blue-700">{formatWon(kpi.share)}</strong>
            <span className="text-muted-foreground mx-2">/</span>
            회사 <strong className="text-emerald-700">{formatWon(kpi.company)}</strong>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-sm font-bold">호실별 손익 {rows.length}건</p>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            임대 계약이 입력된 물건이 없습니다. 파이프라인 → 임대가능에서 계약을 등록하세요.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map(({ p, monthlyFee, rec, receipt }) => (
              <li key={p.id} className="px-4 py-3">
                <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="w-full text-left">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold text-sm">{p.address}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.tenant_name ?? "임차인 미기입"}
                    </span>
                    {rec.recoveredDone ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        회수 완료 · 배분중
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        회수 {rec.recoveryRate}%
                        {rec.monthsToRecover ? ` · 약 ${rec.monthsToRecover}개월 남음` : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={rec.recoveredDone ? "h-full bg-emerald-500" : "h-full bg-amber-500"}
                      style={{ width: `${rec.recoveryRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    월세 {formatWon(p.monthly_rent ?? 0)} · 수수료 {p.management_fee_rate ?? 0}% ={" "}
                    <strong className="text-foreground">{formatWon(monthlyFee)}</strong>
                    {" · "}투입 {formatWon(p.fieldTeamCost)} · 잔여 {formatWon(rec.remaining)}
                    {rec.distributable > 0 && ` · 배분대상 ${formatWon(rec.distributable)}`}
                  </p>
                </button>

                {receipt && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-muted-foreground">
                      {period} 예정 {formatWon(receipt.expected)}
                      {receipt.due_date ? ` · ${receipt.due_date} 수금` : ""}
                    </span>
                    {receipt.received > 0 ? (
                      <span className="font-bold text-emerald-700">
                        수납 {formatWon(receipt.received)}
                      </span>
                    ) : (
                      <button
                        onClick={() => markPaid(p.id, receipt.expected)}
                        disabled={pending}
                        className="px-2 py-1 rounded-md bg-emerald-600 text-white font-bold disabled:opacity-50"
                      >
                        전액 수납 처리
                      </button>
                    )}
                  </div>
                )}

                {openId === p.id && (
                  <PropertyEditor
                    property={p}
                    onDone={() => {
                      setOpenId(null);
                      router.refresh();
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {trend.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-bold mb-3">월별 수입 추이</p>
          <div className="space-y-1.5">
            {trend.map((t) => {
              const rate = t.expected > 0 ? Math.round((t.received / t.expected) * 100) : 0;
              return (
                <div key={t.period} className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-bold">{t.period}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${rate}%` }} />
                  </div>
                  <span className="w-40 text-right text-muted-foreground">
                    {formatWon(t.received)} / {formatWon(t.expected)} ({rate}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "emerald" | "rose" | "amber";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "rose"
        ? "text-rose-700"
        : tone === "amber"
          ? "text-amber-800"
          : "text-blue-700";
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-black mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted-foreground mb-0.5">{label}</span>
      {children}
    </label>
  );
}

/** 계약 조건·지출 입력 */
function PropertyEditor({ property, onDone }: { property: RevenueProperty; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState(property.lease_start ?? "");
  const [end, setEnd] = useState(property.lease_end ?? "");
  const [dueDay, setDueDay] = useState(property.rent_due_day?.toString() ?? "");
  const [feeRate, setFeeRate] = useState((property.management_fee_rate ?? 0).toString());
  const [shareRate, setShareRate] = useState((property.profit_share_rate ?? 0).toString());
  const [rent, setRent] = useState((property.monthly_rent ?? 0).toString());

  const [cat, setCat] = useState("repair");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState<"field_team" | "company" | "landlord">("field_team");
  const [provider, setProvider] = useState("");

  function saveTerms() {
    startTransition(async () => {
      const res = await saveLeaseTerms({
        propertyId: property.id,
        leaseStart: start || null,
        leaseEnd: end || null,
        rentDueDay: dueDay ? Number(dueDay) : null,
        managementFeeRate: Number(feeRate) || 0,
        profitShareRate: Number(shareRate) || 0,
        monthlyRent: Number(rent) || 0,
      });
      if (!res.ok) {
        toast.error(res.error ?? "저장 실패");
        return;
      }
      toast.success("계약 조건 저장");
      onDone();
    });
  }

  function saveCost() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("금액을 입력하세요");
      return;
    }
    startTransition(async () => {
      const res = await addWorkCost({
        propertyId: property.id,
        category: cat,
        amount: Math.round(amt),
        payer,
        provider: provider || null,
        workDate: new Date().toISOString().slice(0, 10),
      });
      if (!res.ok) {
        toast.error(res.error ?? "저장 실패");
        return;
      }
      toast.success("지출 추가");
      setAmount("");
      setProvider("");
      onDone();
    });
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-3">
      <div>
        <p className="text-xs font-bold mb-2">계약 조건</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Field label="시작일">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="만기일">
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </Field>
          <Field label="수금일(1~31)">
            <input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="월세(원)">
            <input type="number" value={rent} onChange={(e) => setRent(e.target.value)} className={inputCls} />
          </Field>
          <Field label="관리수수료율 %">
            <input type="number" value={feeRate} onChange={(e) => setFeeRate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="현장팀 배분율 %">
            <input type="number" value={shareRate} onChange={(e) => setShareRate(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <button
          onClick={saveTerms}
          disabled={pending}
          className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
        >
          계약 조건 저장
        </button>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-bold mb-2">
          지출 추가
          <span className="font-normal text-muted-foreground ml-1">
            — 현장팀 부담분만 회수 대상입니다
          </span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
          <Field label="항목">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
              {COST_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="금액(원)">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="부담">
            <select
              value={payer}
              onChange={(e) => setPayer(e.target.value as "field_team" | "company" | "landlord")}
              className={inputCls}
            >
              <option value="field_team">현장팀</option>
              <option value="company">회사</option>
              <option value="landlord">임대인</option>
            </select>
          </Field>
          <Field label="거래처">
            <input value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <button
          onClick={saveCost}
          disabled={pending}
          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> 지출 추가
        </button>
      </div>
    </div>
  );
}
