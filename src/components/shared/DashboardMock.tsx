"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Sparkles, Bug, ArrowUpDown, Flame,
  Scale, Wrench, Briefcase, MessageSquare, FileText, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChipKind = "done" | "active" | "wait";
function Chip({ kind, label, icon: Icon }: { kind: ChipKind; label: string; icon?: React.ComponentType<{ className?: string }> }) {
  const styles: Record<ChipKind, string> = {
    done: "text-emerald-600 bg-emerald-50",
    active: "text-primary bg-primary/8",
    wait: "text-foreground/55 bg-[#EEF1F5]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0", styles[kind])}>
      {Icon && <Icon className="h-3 w-3" />}{label}
    </span>
  );
}

function Row({ initial, icon: Icon, name, note, right }: { initial?: string; icon?: React.ComponentType<{ className?: string }>; name: string; note?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-[#F7F8FB] px-3 py-2.5">
      {initial && <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">{initial}</span>}
      {Icon && <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5 text-primary" /></span>}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-foreground truncate leading-tight">{name}</p>
        {note && <p className="text-[10.5px] text-muted-foreground truncate">{note}</p>}
      </div>
      {right}
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

/* ── 1. 월세 정산 현황 ─────────────────────────────── */
function SettlementScreen() {
  return (
    <div className="space-y-2">
      <Row initial="박" name="인천 박○○ 소유주님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">1,200만원</span><Chip kind="done" label="정산완료" icon={CheckCircle2} /></span>} />
      <Row initial="김" name="일산 김○○ 님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">2,170만원</span><Chip kind="done" label="정산완료" icon={CheckCircle2} /></span>} />
      <Row initial="정" name="부천 정○○ 님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">950만원</span><Chip kind="done" label="정산완료" icon={CheckCircle2} /></span>} />
      <Row initial="이" name="서울 이○○ 님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">2,700만원</span><Chip kind="active" label="정산예정" icon={Clock} /></span>} />
      <SummaryBar leftLabel="이번 달 총 정산" leftValue="7,020만원" rightLabel="수금률" rightValue="98%" pct={98} />
    </div>
  );
}

/* ── 2. 임차인 민원 접수 ───────────────────────────── */
function ComplaintIntakeScreen() {
  return (
    <div className="space-y-2">
      <Row icon={MessageSquare} name="302호 · 천장 누수" note="방금 접수" right={<Chip kind="wait" label="접수" icon={Inbox} />} />
      <Row icon={MessageSquare} name="501호 · 보일러 고장" note="5분 전" right={<Chip kind="active" label="처리중" icon={Clock} />} />
      <Row icon={MessageSquare} name="1층 · 공용 조명 점멸" note="12분 전" right={<Chip kind="active" label="처리중" icon={Clock} />} />
      <Row icon={MessageSquare} name="203호 · 도어락 교체" note="22분 전" right={<Chip kind="wait" label="접수" icon={Inbox} />} />
      <SummaryBar leftLabel="오늘 접수" leftValue="4건" rightLabel="평균 응답" rightValue="12분" pct={85} />
    </div>
  );
}

/* ── 3. 민원 처리 완료 ─────────────────────────────── */
function ComplaintDoneScreen() {
  return (
    <div className="space-y-2">
      <Row icon={Wrench} name="302호 천장 누수" note="방수 보수 완료" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={Wrench} name="501호 보일러 교체" note="당일 출동 처리" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={Wrench} name="공용 조명 LED 교체" note="사진 보고 첨부" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={Wrench} name="203호 도어락 설치" note="입주민 확인 완료" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <SummaryBar leftLabel="이번 달 처리" leftValue="24건" rightLabel="처리율" rightValue="100%" pct={100} />
    </div>
  );
}

/* ── 4. 서류 발급·접수 ─────────────────────────────── */
function DocumentScreen() {
  return (
    <div className="space-y-2">
      <Row icon={FileText} name="임대차 계약서" note="박○○ 님" right={<Chip kind="done" label="발급완료" icon={CheckCircle2} />} />
      <Row icon={FileText} name="월 정산 내역서" note="6월분" right={<Chip kind="done" label="발급완료" icon={CheckCircle2} />} />
      <Row icon={FileText} name="전입세대 확인서" note="302호" right={<Chip kind="done" label="발급완료" icon={CheckCircle2} />} />
      <Row icon={FileText} name="보증금 영수증" note="501호" right={<Chip kind="active" label="요청 접수" icon={Clock} />} />
      <SummaryBar leftLabel="이번 달 발급" leftValue="38건" rightLabel="처리 소요" rightValue="당일" pct={92} />
    </div>
  );
}

/* ── 5. 이번 주 건물관리 ───────────────────────────── */
function WeeklyCareScreen() {
  return (
    <div className="space-y-2">
      <Row icon={Sparkles} name="공용부 청소" note="지하·계단·복도" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={Bug} name="정기 방역" note="해충·악취 차단" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={ArrowUpDown} name="엘리베이터 점검" note="정상 가동 확인" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={Flame} name="소방시설 점검" note="이번 주 예정" right={<Chip kind="active" label="예정" icon={Clock} />} />
      <SummaryBar leftLabel="이번 주 관리" leftValue="주 1회 정기" rightLabel="사진 보고" rightValue="첨부" pct={75} />
    </div>
  );
}

/* ── 6. 전담팀 처리 현황 ───────────────────────────── */
function TeamScreen() {
  return (
    <div className="space-y-2">
      <Row icon={Scale} name="분쟁해결 전담팀" note="임차인 분쟁·보증금" right={<Chip kind="active" label="처리 중 2건" />} />
      <Row icon={Wrench} name="건물관리 전담팀" note="시설·청소·방역" right={<Chip kind="done" label="정상 가동" />} />
      <Row icon={Briefcase} name="위탁운용 전담팀" note="HUG·경매 대응" right={<Chip kind="active" label="진행 3건" />} />
      <SummaryBar leftLabel="전담팀 운영" leftValue="3개 팀 가동" rightLabel="평균 해결" rightValue="2개월" pct={100} />
    </div>
  );
}

const SCREENS = [
  { title: "월세 정산 현황", Comp: SettlementScreen },
  { title: "임차인 민원 접수", Comp: ComplaintIntakeScreen },
  { title: "민원 처리 현황", Comp: ComplaintDoneScreen },
  { title: "서류 발급·접수", Comp: DocumentScreen },
  { title: "이번 주 건물관리", Comp: WeeklyCareScreen },
  { title: "전담팀 처리 현황", Comp: TeamScreen },
];

/**
 * JNP 관리 OS 코드 목업 — 영상처럼 여러 화면이 순환된다.
 * 정산 → 민원 접수 → 민원 처리 → 서류 → 주간 관리 → 전담팀.
 * 사진 대신 쓰는 프리미엄 "제품 화면".
 */
export function DashboardMock({ className }: { className?: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % SCREENS.length), 2800);
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
              <span key={s.title} className={cn("h-1.5 rounded-full transition-all duration-300", idx === i ? "w-4 bg-primary" : "w-1.5 bg-[#D9DEE8]")} />
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
