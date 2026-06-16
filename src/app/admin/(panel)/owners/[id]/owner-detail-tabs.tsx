"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, DoorOpen, Phone, Mail, Wallet, Receipt, FileText, TrendingUp } from "lucide-react";
import { OwnerDialog, type SafeOwner } from "../owner-dialog";
import { modeLabel, type OwnerPipeline } from "../constants";
import type { OwnerDetail, OwnerBuilding, OwnerUnit, SettlementRow, OwnerExpense, OwnerFinance } from "./types";
import { PropertyManager } from "./property-manager";
import { ExpenseManager } from "./expense-manager";
import { formatWon } from "@/lib/money";

function ModeBadges({ modes }: { modes: string[] }) {
  if (modes.length === 0) return <span className="text-xs text-muted-foreground">관리유형 미지정</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {modes.map((m) => {
        const ml = modeLabel(m);
        return <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ml.color}`}>{ml.label}</span>;
      })}
    </div>
  );
}

export function OwnerDetailTabs({
  detail, buildings, standaloneUnits, pipe, tenants, commissions, finance, expenses,
}: {
  detail: OwnerDetail;
  buildings: OwnerBuilding[];
  standaloneUnits: OwnerUnit[];
  pipe: OwnerPipeline | null;
  tenants: { id: string; name: string }[];
  commissions: SettlementRow[];
  finance: OwnerFinance;
  expenses: OwnerExpense[];
}) {
  const safe: SafeOwner = {
    id: detail.id, name: detail.name, phone: detail.phone, email: detail.email,
    account_bank: detail.account_bank, account_holder: detail.account_holder,
    business_name: detail.business_name, business_number: detail.business_number,
    representative: detail.representative, memo: detail.memo,
  };
  const allModes = Array.from(new Set([
    ...buildings.flatMap((b) => b.modes),
    ...buildings.flatMap((b) => b.units.flatMap((u) => u.modes)),
    ...standaloneUnits.flatMap((u) => u.modes),
  ]));

  // 지출 등록용 호실 목록 (건물·호실 평탄화)
  const unitOptions = [
    ...buildings.flatMap((b) => b.units.map((u) => ({ id: u.id, label: `${b.name} · ${u.label}` }))),
    ...standaloneUnits.map((u) => ({ id: u.id, label: `단독 · ${u.label}` })),
  ];

  const pendingSum = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.commission_amount, 0);
  const paidSum = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commission_amount, 0);

  return (
    <div className="space-y-5">
      {/* 헤더 + 요약 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{detail.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">우리 회사에 운영을 맡긴 소유주(임대인)</p>
          <div className="mt-1.5"><ModeBadges modes={allModes} /></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <Summary label="건물" value={pipe?.building_count ?? buildings.length} icon={Building2} />
            <Summary label="호실" value={pipe?.unit_count ?? 0} icon={DoorOpen} />
            <Summary label="공실" value={pipe?.vacant_count ?? 0} tone={(pipe?.vacant_count ?? 0) > 0 ? "amber" : undefined} />
            <Summary label="임차중" value={pipe?.occupied_count ?? 0} />
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={`/admin/owners/${detail.id}/statement`}><FileText className="h-3.5 w-3.5" /> 임대인 청구서</Link>
          </Button>
        </div>
      </div>

      {/* ── 이번 달 정산 파이프라인 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> {finance.monthLabel} 정산 파이프라인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Metric label="받을 월세(청구)" value={finance.billed} />
            <Metric label="수금" value={finance.collected} tone="emerald" />
            <Metric label="미수금" value={finance.outstanding} tone={finance.outstanding > 0 ? "rose" : undefined} />
            <Metric label="회사 수수료" value={finance.commission} sign="minus" />
            <Metric label="임대인 부담 지출" value={finance.expenseOwner} sign="minus" />
            <Metric label="임대인 지급 예정" value={finance.ownerPayout} tone="primary" strong />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            임대인 지급 예정액 = 이번 달 <strong>수금</strong> − 회사 위탁수수료 − 임대인 부담 지출. (지출은 아래 &quot;호실 지출·수익분배&quot; 기준)
          </p>
        </CardContent>
      </Card>

      {/* ── 기본정보 ── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">기본정보</CardTitle>
          <OwnerDialog mode="edit" owner={safe} />
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Field icon={Phone} label="연락처" value={detail.phone} />
            <Field icon={Mail} label="이메일" value={detail.email} />
            <Field icon={Wallet} label="계좌" value={[detail.account_bank, detail.account_holder, detail.account_masked].filter(Boolean).join(" · ")} />
            <Field label="사업자명" value={detail.business_name} />
            <Field label="사업자번호" value={detail.business_number} />
            <Field label="대표자" value={detail.representative} />
          </dl>
          {detail.memo && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">메모</p>
              <p className="text-sm whitespace-pre-wrap">{detail.memo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 물건 (건물·호실·계약) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> 물건 (건물·호실·계약)</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertyManager ownerId={detail.id} buildings={buildings} standaloneUnits={standaloneUnits} tenants={tenants} />
        </CardContent>
      </Card>

      {/* ── 호실 지출·수익분배 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> 호실 지출·수익분배</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseManager ownerId={detail.id} units={unitOptions} expenses={expenses} />
        </CardContent>
      </Card>

      {/* ── 정산 (위탁수수료) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> 위탁수수료 정산</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 text-sm">
            <span className="text-muted-foreground">정산대기 <strong className="text-amber-600">{formatWon(pendingSum)}원</strong></span>
            <span className="text-muted-foreground">지급완료 <strong className="text-emerald-600">{formatWon(paidSum)}원</strong></span>
          </div>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              정산(수수료) 내역이 없습니다. 계약 활성화 + 월 정산 생성 시 표시됩니다.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr><th className="text-left px-3 py-2">기간</th><th className="text-right px-3 py-2">기준액</th><th className="text-right px-3 py-2">수수료</th><th className="text-center px-3 py-2">상태</th></tr>
                </thead>
                <tbody className="divide-y">
                  {commissions.map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{c.period_start?.slice(0, 7)}{c.period_end && c.period_end.slice(0, 7) !== c.period_start?.slice(0, 7) ? ` ~ ${c.period_end.slice(0, 7)}` : ""}</td>
                      <td className="px-3 py-2 text-right">{formatWon(c.base_amount)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatWon(c.commission_amount)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.status === "paid" ? "bg-emerald-100 text-emerald-700" : c.status === "waived" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>
                          {c.status === "paid" ? "지급" : c.status === "waived" ? "면제" : "대기"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">수수료율은 각 계약에서 설정됩니다. 월 정산 생성은 수금·청구에서.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value, icon: Icon, tone }: { label: string; value: number; icon?: React.ComponentType<{ className?: string }>; tone?: "amber" }) {
  return (
    <div className="text-center">
      <div className="flex items-center gap-1 justify-center text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${tone === "amber" ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value, tone, sign, strong }: { label: string; value: number; tone?: "emerald" | "rose" | "primary"; sign?: "minus"; strong?: boolean }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : tone === "primary" ? "text-primary" : "";
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`${strong ? "text-lg" : "text-base"} font-bold tabular-nums ${color}`}>
        {sign === "minus" && value > 0 ? "−" : ""}{formatWon(value)}<span className="text-xs font-normal text-muted-foreground">원</span>
      </p>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string | null }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">{Icon && <Icon className="h-3 w-3" />}{label}</dt>
      <dd className="mt-0.5">{value || <span className="text-muted-foreground">-</span>}</dd>
    </div>
  );
}
