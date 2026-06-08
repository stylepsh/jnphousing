"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Sparkles, Bug, ArrowUpDown, Flame,
  Scale, Wrench, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── 화면 1: 소유주별 월세 정산 현황 ───────────────────────── */
function SettlementScreen() {
  const rows = [
    { initial: "박", name: "인천 박○○ 소유주님", amount: "1,200만원", done: true },
    { initial: "김", name: "일산 김○○ 님", amount: "2,170만원", done: true },
    { initial: "정", name: "부천 정○○ 님", amount: "950만원", done: true },
    { initial: "이", name: "서울 이○○ 님", amount: "2,700만원", done: false },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2.5 rounded-xl bg-[#F7F8FB] px-3 py-2.5">
          <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">{r.initial}</span>
          <span className="text-[12.5px] font-medium text-foreground truncate flex-1">{r.name}</span>
          <span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">{r.amount}</span>
          {r.done ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> 정산완료
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/8 rounded-full px-2 py-0.5 shrink-0">
              <Clock className="h-3 w-3" /> 정산예정
            </span>
          )}
        </div>
      ))}
      <SummaryBar leftLabel="이번 달 총 정산" leftValue="7,020만원" rightLabel="수금률" rightValue="98%" pct={98} />
    </div>
  );
}

/* ── 화면 2: 매주 1회 건물 정상화 관리 ───────────────────── */
function WeeklyCareScreen() {
  const rows = [
    { icon: Sparkles, name: "공용부 청소", note: "지하·계단·복도", done: true },
    { icon: Bug, name: "정기 방역", note: "해충·악취 차단", done: true },
    { icon: ArrowUpDown, name: "엘리베이터 점검", note: "정상 가동 확인", done: true },
    { icon: Flame, name: "소방시설 점검", note: "이번 주 예정", done: false },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <div key={r.name} className="flex items-center gap-2.5 rounded-xl bg-[#F7F8FB] px-3 py-2.5">
            <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5 text-primary" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-foreground truncate leading-tight">{r.name}</p>
              <p className="text-[10.5px] text-muted-foreground truncate">{r.note}</p>
            </div>
            {r.done ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
                <CheckCircle2 className="h-3 w-3" /> 완료
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/8 rounded-full px-2 py-0.5 shrink-0">
                <Clock className="h-3 w-3" /> 예정
              </span>
            )}
          </div>
        );
      })}
      <SummaryBar leftLabel="이번 주 관리" leftValue="주 1회 정기" rightLabel="사진 보고" rightValue="첨부" pct={75} />
    </div>
  );
}

/* ── 화면 3: 전담팀 처리 현황 ──────────────────────────── */
function TeamScreen() {
  const rows = [
    { icon: Scale, name: "분쟁해결 전담팀", note: "임차인 분쟁·보증금", status: "처리 중 2건" },
    { icon: Wrench, name: "건물관리 전담팀", note: "시설·청소·방역", status: "정상 가동" },
    { icon: Briefcase, name: "위탁운용 전담팀", note: "HUG·경매 대응", status: "진행 3건" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <div key={r.name} className="flex items-center gap-2.5 rounded-xl bg-[#F7F8FB] px-3 py-3">
            <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">{r.name}</p>
              <p className="text-[10.5px] text-muted-foreground truncate">{r.note}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/8 rounded-full px-2 py-0.5 shrink-0">{r.status}</span>
          </div>
        );
      })}
      <SummaryBar leftLabel="전담팀 운영" leftValue="3개 팀 가동" rightLabel="평균 해결" rightValue="2개월" pct={100} />
    </div>
  );
}

function SummaryBar({ leftLabel, leftValue, rightLabel, rightValue, pct }: { leftLabel: string; leftValue: string; rightLabel: string; rightValue: string; pct: number }) {
  return (
    <div className="mt-3.5 rounded-xl bg-primary px-4 py-3 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/70">{leftLabel}</p>
          <p className="text-base font-bold tabular-nums leading-tight">{leftValue}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-white/70">{rightLabel}</p>
          <p className="text-base font-bold tabular-nums leading-tight">{rightValue}</p>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
        <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const SCREENS = [
  { tag: "정산", title: "월세 정산 현황", Comp: SettlementScreen },
  { tag: "관리", title: "이번 주 건물관리", Comp: WeeklyCareScreen },
  { tag: "전담팀", title: "전담팀 처리 현황", Comp: TeamScreen },
];

/**
 * JNP 관리 OS 코드 목업 — 영상처럼 여러 화면이 순환된다.
 * 정산 → 주간 관리 → 전담팀 처리. 사진 대신 쓰는 프리미엄 "제품 화면".
 */
export function DashboardMock({ className }: { className?: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % SCREENS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const active = SCREENS[i];
  const Comp = active.Comp;

  return (
    <div className={cn("rounded-2xl bg-white border border-[#E8EBF0] shadow-2xl shadow-primary/10 overflow-hidden select-none", className)}>
      {/* 윈도우 바 */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#F0F2F6]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E2E6EE]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E2E6EE]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E2E6EE]" />
        <span className="ml-auto text-[11px] font-medium text-muted-foreground">JNP 관리 OS</span>
      </div>

      {/* 본문 */}
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-foreground">{active.title}</p>
          <div className="flex items-center gap-1.5">
            {SCREENS.map((s, idx) => (
              <span key={s.tag} className={cn("h-1.5 rounded-full transition-all duration-300", idx === i ? "w-4 bg-primary" : "w-1.5 bg-[#D9DEE8]")} />
            ))}
          </div>
        </div>

        {/* 화면 전환 (페이드) */}
        <div key={i} className="animate-fade-in min-h-[268px]">
          <Comp />
        </div>
      </div>
    </div>
  );
}
