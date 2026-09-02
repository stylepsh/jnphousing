"use client";

import * as React from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Upload, Loader2, AlertTriangle, FileSpreadsheet, DoorOpen, CheckCircle2 } from "lucide-react";
import { importRentalWorkbook, type ImportResult } from "./actions";
import { calcSettlement, contractStatus, type WorkbookSummary } from "@/lib/auction/rental-workbook";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const man = (n: number) => `${Math.round(n / 10000).toLocaleString("ko-KR")}만`;
const AGENCY_COLORS = ["#1C2B4A", "#3182F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

export function RentalImportClient() {
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [fileName, setFileName] = React.useState("");

  // 정산 조건
  const [feeRate, setFeeRate] = React.useState(40);
  const [basis, setBasis] = React.useState<"paid" | "charged">("paid");
  const [cost, setCost] = React.useState(0);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const fd = new FormData();
    fd.append("file", f);
    start(async () => setResult(await importRentalWorkbook(fd)));
  }

  const summary: WorkbookSummary | null = result?.ok ? result.summary : null;
  const settlement = summary
    ? calcSettlement(summary, { feeRatePercent: feeRate, basis, costToRecover: cost })
    : null;

  return (
    <div className="space-y-6">
      {/* 업로드 */}
      <div className="rounded-xl border border-border bg-card p-6">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-10 transition-colors hover:border-primary/50 hover:bg-muted/40">
          {pending ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold">
            {pending ? "읽는 중…" : "엑셀 파일 선택 (.xlsx)"}
          </span>
          <span className="text-xs text-muted-foreground">
            {fileName || "JNP_임대취합.xlsx 를 올려주세요"}
          </span>
          <input type="file" accept=".xlsx" className="hidden" onChange={onFile} disabled={pending} />
        </label>

        {result && !result.ok && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {result.error}
          </p>
        )}
      </div>

      {summary && settlement && (
        <>
          {/* 잘못된 곳 탐지 — 그대로 정산하면 숫자가 틀어진다 */}
          {summary.issues.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> 이상 없음 — 계약 {summary.totals.contractCount}건 모두 정상입니다.
            </p>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle className="h-4 w-4" />
                확인이 필요한 항목 {summary.issues.length}건
                <span className="ml-1 text-xs font-normal text-red-700">
                  (심각 {summary.issues.filter((i) => i.level === "high").length} ·
                  주의 {summary.issues.filter((i) => i.level === "medium").length} ·
                  참고 {summary.issues.filter((i) => i.level === "low").length})
                </span>
              </p>
              <div className="mt-3 max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {summary.issues.map((it, i) => (
                      <tr key={i} className="border-b border-red-100 last:border-0">
                        <td className="py-1.5 pr-2 align-top">
                          <span className={
                            "rounded px-1.5 py-0.5 text-[10px] font-bold " +
                            (it.level === "high" ? "bg-red-600 text-white"
                              : it.level === "medium" ? "bg-amber-500 text-white"
                              : "bg-slate-300 text-slate-700")
                          }>
                            {it.level === "high" ? "심각" : it.level === "medium" ? "주의" : "참고"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-1.5 pr-2 align-top text-slate-500">{it.row}행</td>
                        <td className="py-1.5 pr-2 align-top font-medium">{it.address}</td>
                        <td className="py-1.5 align-top text-slate-700">{it.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-red-700">
                엑셀에서 해당 행을 고친 뒤 다시 올려주세요. 고치기 전 숫자는 실제와 다를 수 있습니다.
              </p>
            </div>
          )}

          {/* 계약 만료 → 공실 전환 */}
          {summary.vacancySoon.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-orange-900">
                <DoorOpen className="h-4 w-4" />
                공실 전환 {summary.vacancySoon.length}건
                <span className="text-xs font-normal">
                  (이미 만료 {summary.statusCount["만료(공실)"] ?? 0} · 30일 내 만료 {summary.statusCount["만료임박"] ?? 0})
                </span>
              </p>
              <div className="mt-3 max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-orange-800">
                      <th className="py-1">주소</th>
                      <th className="py-1">임차인</th>
                      <th className="py-1">계약종료</th>
                      <th className="py-1">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.vacancySoon.map((v, i) => (
                      <tr key={i} className="border-t border-orange-100">
                        <td className="py-1.5 font-medium">{v.address}</td>
                        <td className="py-1.5">{v.tenant || "—"}</td>
                        <td className="py-1.5">{v.leaseEnd}</td>
                        <td className="py-1.5">
                          <span className={
                            "rounded px-1.5 py-0.5 text-[10px] font-bold " +
                            (v.status === "만료(공실)" ? "bg-red-600 text-white" : "bg-amber-500 text-white")
                          }>
                            {v.status === "만료(공실)" ? `공실 (${-v.daysLeft}일 경과)` : `${v.daysLeft}일 남음`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-orange-800">
                계약이 끝난 물건은 다시 공실입니다. 갱신하거나 부동산에 재의뢰하세요.
              </p>
            </div>
          )}

          {/* 요약 카드 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "계약 건수", value: `${summary.totals.contractCount}건`, danger: false },
              { label: "임대중", value: `${summary.statusCount["임대중"] ?? 0}건`, danger: false },
              {
                label: "공실 전환",
                value: `${summary.statusCount["만료(공실)"] ?? 0}건`,
                danger: (summary.statusCount["만료(공실)"] ?? 0) > 0,
              },
              { label: "월세 합계", value: won(summary.totals.monthlyRentSum), danger: false },
              { label: "누적 입금", value: won(summary.totals.paidSum), danger: false },
              {
                label: "미납",
                value: won(summary.totals.unpaidSum),
                danger: summary.totals.unpaidSum > 0,
              },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`mt-1 text-xl font-bold ${c.danger ? "text-red-600" : ""}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* 월별 청구·입금·미납 */}
          {summary.monthly.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 font-semibold">월별 청구 · 입금 · 미납</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <LineChart data={summary.monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tickFormatter={man} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip formatter={(v) => won(Number(v ?? 0))} />
                    <Legend />
                    <Line type="monotone" dataKey="charged" name="청구" stroke="#1C2B4A" strokeWidth={2} />
                    <Line type="monotone" dataKey="paid" name="입금" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="unpaid" name="미납" stroke="#DC2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                수금률 {(summary.totals.collectionRate * 100).toFixed(1)}%
                (청구 {won(summary.totals.chargedSum)} 중 {won(summary.totals.paidSum)} 입금)
              </p>
            </div>
          )}

          {/* 부동산별 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">부동산별 계약 실적</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={summary.byAgency} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="agency" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tickFormatter={man} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => won(Number(v ?? 0))} />
                  <Bar dataKey="monthlyRent" name="월세 합계" radius={[6, 6, 0, 0]}>
                    {summary.byAgency.map((_, i) => (
                      <Cell key={i} fill={AGENCY_COLORS[i % AGENCY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2">부동산</th>
                    <th className="py-2 text-right">계약</th>
                    <th className="py-2 text-right">월세 합계</th>
                    <th className="py-2 text-right">보증금 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byAgency.map((a) => (
                    <tr key={a.agency} className="border-b border-border/50">
                      <td className="py-2 font-medium">{a.agency}</td>
                      <td className="py-2 text-right">{a.count}건</td>
                      <td className="py-2 text-right">{won(a.monthlyRent)}</td>
                      <td className="py-2 text-right">{won(a.deposit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 정산 계산기 */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="h-4 w-4" /> 정산 계산
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">우리 수익률 (%)</span>
                <input
                  type="number" min={0} max={100} step={0.5} value={feeRate}
                  onChange={(e) => setFeeRate(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">정산 기준</span>
                <select
                  value={basis}
                  onChange={(e) => setBasis(e.target.value as "paid" | "charged")}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="paid">실제 입금액 (권장)</option>
                  <option value="charged">청구액 (미수 포함)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">회수할 투입비 (원)</span>
                <input
                  type="number" min={0} step={10000} value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "정산 기준 금액", value: won(settlement.base), strong: false },
                { label: `우리 몫 (${feeRate}%)`, value: won(settlement.fee), strong: true },
                { label: "임대인 몫", value: won(settlement.ownerShare), strong: false },
                { label: "투입비 회수 후", value: won(settlement.netToUs), strong: true },
              ].map((c) => (
                <div key={c.label} className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className={`mt-1 font-bold ${c.strong ? "text-lg text-primary" : "text-base"}`}>
                    {c.value}
                  </p>
                </div>
              ))}
            </div>

            {settlement.remainingCost > 0 && (
              <p className="mt-3 text-sm text-amber-700">
                투입비 {won(settlement.remainingCost)} 가 아직 회수되지 않았습니다.
              </p>
            )}
            {basis === "charged" && (
              <p className="mt-3 text-sm text-amber-700">
                청구액 기준은 아직 못 받은 {won(summary.totals.unpaidSum)} 도 수익으로 잡습니다.
                실제 받을 금액은 입금액 기준으로 보세요.
              </p>
            )}
          </div>

          {/* 계약 목록 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">계약 목록 ({summary.contracts.length}건)</h2>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2">주소</th>
                    <th className="py-2">임차인</th>
                    <th className="py-2">부동산</th>
                    <th className="py-2 text-right">보증금</th>
                    <th className="py-2 text-right">월세</th>
                    <th className="py-2">계약기간</th>
                    <th className="py-2 text-right">납부일</th>
                    <th className="py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.contracts.map((c, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2">{c.address}</td>
                      <td className="py-2">{c.tenant || "—"}</td>
                      <td className="py-2">{c.agency || "—"}</td>
                      <td className="py-2 text-right">{won(c.deposit)}</td>
                      <td className="py-2 text-right">{won(c.monthlyRent)}</td>
                      <td className="py-2 text-xs">
                        {c.leaseStart ?? "—"} ~ {c.leaseEnd ?? "—"}
                      </td>
                      <td className="py-2 text-right">{c.dueDay ? `${c.dueDay}일` : "—"}</td>
                      <td className="py-2">
                        {(() => {
                          const { status } = contractStatus(c);
                          const tone =
                            status === "만료(공실)" ? "bg-red-100 text-red-700"
                            : status === "만료임박" ? "bg-amber-100 text-amber-800"
                            : status === "임대중" ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600";
                          return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>{status}</span>;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
