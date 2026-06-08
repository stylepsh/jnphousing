"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Sparkles, Bug, ArrowUpDown, Flame,
  Scale, Wrench, Briefcase, FileText, User, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* 컬러 아이콘 타일 (잡색 아님 — 앱 아이콘처럼 기능별 색) */
type Tone = "emerald" | "sky" | "violet" | "amber" | "rose" | "teal" | "indigo" | "blue";
const TILE: Record<Tone, string> = {
  emerald: "bg-emerald-100 text-emerald-600",
  sky: "bg-sky-100 text-sky-600",
  violet: "bg-violet-100 text-violet-600",
  amber: "bg-amber-100 text-amber-600",
  rose: "bg-rose-100 text-rose-600",
  teal: "bg-teal-100 text-teal-600",
  indigo: "bg-indigo-100 text-indigo-600",
  blue: "bg-blue-100 text-blue-600",
};

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

function Row({ initial, icon: Icon, tone = "blue", name, note, right }: { initial?: string; icon?: React.ComponentType<{ className?: string }>; tone?: Tone; name: string; note?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-[#F7F8FB] px-3 py-2">
      {initial && <span className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0", TILE[tone])}>{initial}</span>}
      {Icon && <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", TILE[tone])}><Icon className="h-3.5 w-3.5" /></span>}
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

/* 카톡형 대화 — them(임차인/소유주)=흰색 좌측, JNP=노랑 우측 */
function ChatScreen({ avatar: Avatar, avatarTone, rows }: { avatar: React.ComponentType<{ className?: string }>; avatarTone: Tone; rows: { who: "them" | "jnp"; t: string }[] }) {
  return (
    <div className="space-y-2.5 pt-1">
      {rows.map((m, i) =>
        m.who === "them" ? (
          <div key={i} className="flex items-end gap-1.5">
            <span className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0", TILE[avatarTone])}><Avatar className="h-3.5 w-3.5" /></span>
            <div className="max-w-[80%] bg-white border border-[#EBEEF3] rounded-2xl rounded-bl-md px-3 py-2 text-[12.5px] leading-snug text-foreground shadow-sm">{m.t}</div>
          </div>
        ) : (
          <div key={i} className="flex justify-end">
            <div className="max-w-[82%] bg-[#FEE500] rounded-2xl rounded-br-md px-3 py-2 text-[12.5px] leading-snug text-[#3C1E1E] shadow-sm">{m.t}</div>
          </div>
        )
      )}
    </div>
  );
}

/* ── 1. 월세 정산 현황 ─────────────────────────────── */
function SettlementScreen() {
  return (
    <div className="space-y-2">
      <Row initial="박" tone="emerald" name="인천 박○○ 소유주님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">1,200만원</span><Chip kind="done" label="정산완료" icon={CheckCircle2} /></span>} />
      <Row initial="김" tone="sky" name="일산 김○○ 님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">2,170만원</span><Chip kind="done" label="정산완료" icon={CheckCircle2} /></span>} />
      <Row initial="정" tone="violet" name="부천 정○○ 님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">950만원</span><Chip kind="done" label="정산완료" icon={CheckCircle2} /></span>} />
      <Row initial="이" tone="amber" name="서울 이○○ 님" right={<span className="flex items-center gap-2"><span className="text-[12.5px] tabular-nums font-semibold text-foreground/80">2,700만원</span><Chip kind="active" label="정산예정" icon={Clock} /></span>} />
      <SummaryBar leftLabel="이번 달 총 정산" leftValue="7,020만원" rightLabel="수금률" rightValue="98%" pct={98} />
    </div>
  );
}

/* ── 2. 임차인 소통 (민원 실시간 응대) ──────────────── */
function TenantChatScreen() {
  return (
    <ChatScreen
      avatar={User}
      avatarTone="sky"
      rows={[
        { who: "them", t: "302호인데 천장에서 물이 새요 😱" },
        { who: "jnp", t: "바로 기사님 보내드릴게요. 사진 한 장만 부탁드려요!" },
        { who: "them", t: "방금 보냈어요" },
        { who: "jnp", t: "확인했습니다. 오늘 오후 방문 예정이에요 🙂" },
        { who: "them", t: "감사합니다 🙏" },
      ]}
    />
  );
}

/* ── 3. 이번 주 건물관리 ───────────────────────────── */
function WeeklyCareScreen() {
  return (
    <div className="space-y-2">
      <Row icon={Sparkles} tone="sky" name="공용부 청소" note="지하·계단·복도" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={Bug} tone="emerald" name="정기 방역" note="해충·악취 차단" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={ArrowUpDown} tone="indigo" name="엘리베이터 점검" note="정상 가동 확인" right={<Chip kind="done" label="완료" icon={CheckCircle2} />} />
      <Row icon={Flame} tone="rose" name="소방시설 점검" note="이번 주 예정" right={<Chip kind="active" label="예정" icon={Clock} />} />
      <SummaryBar leftLabel="이번 주 관리" leftValue="주 1회 정기" rightLabel="사진 보고" rightValue="첨부" pct={75} />
    </div>
  );
}

/* ── 4. 서류 발급·접수 ─────────────────────────────── */
function DocumentScreen() {
  return (
    <div className="space-y-2">
      <Row icon={FileText} tone="violet" name="임대차 계약서" note="박○○ 님" right={<Chip kind="done" label="발급완료" icon={CheckCircle2} />} />
      <Row icon={FileText} tone="blue" name="월 정산 내역서" note="6월분" right={<Chip kind="done" label="발급완료" icon={CheckCircle2} />} />
      <Row icon={FileText} tone="teal" name="전입세대 확인서" note="302호" right={<Chip kind="done" label="발급완료" icon={CheckCircle2} />} />
      <Row icon={FileText} tone="amber" name="보증금 영수증" note="501호" right={<Chip kind="active" label="요청 접수" icon={Clock} />} />
      <SummaryBar leftLabel="이번 달 발급" leftValue="38건" rightLabel="처리 소요" rightValue="당일" pct={92} />
    </div>
  );
}

/* ── 5. 임대인 보고 (소유주에게 정기 보고) ──────────── */
function LandlordReportScreen() {
  return (
    <ChatScreen
      avatar={Building2}
      avatarTone="emerald"
      rows={[
        { who: "jnp", t: "소유주님, 6월 운영 보고드립니다 📑" },
        { who: "them", t: "네 수고 많으셨어요" },
        { who: "jnp", t: "임대료 7,020만 원 입금 완료, 민원 24건 처리했습니다." },
        { who: "them", t: "공실은요?" },
        { who: "jnp", t: "공실 0 · 연체 0으로 정상입니다 👍" },
      ]}
    />
  );
}

/* ── 6. 전담팀 처리 현황 ───────────────────────────── */
function TeamScreen() {
  return (
    <div className="space-y-2">
      <Row icon={Scale} tone="amber" name="분쟁해결 전담팀" note="임차인 분쟁·보증금" right={<Chip kind="active" label="처리 중 2건" />} />
      <Row icon={Wrench} tone="blue" name="건물관리 전담팀" note="시설·청소·방역" right={<Chip kind="done" label="정상 가동" />} />
      <Row icon={Briefcase} tone="teal" name="위탁운용 전담팀" note="HUG·경매 대응" right={<Chip kind="active" label="진행 3건" />} />
      <SummaryBar leftLabel="전담팀 운영" leftValue="3개 팀 가동" rightLabel="평균 해결" rightValue="2개월" pct={100} />
    </div>
  );
}

const SCREENS = [
  { title: "월세 정산 현황", note: "이번 달 임대료를 소유주님께 정산하고 있습니다", Comp: SettlementScreen },
  { title: "임차인 소통", note: "임차인 민원을 실시간으로 응대하고 있습니다", Comp: TenantChatScreen },
  { title: "이번 주 건물관리", note: "현장 청소·방역·점검을 진행하고 있습니다", Comp: WeeklyCareScreen },
  { title: "서류 발급·접수", note: "필요 서류를 발급·정리하고 있습니다", Comp: DocumentScreen },
  { title: "임대인 보고", note: "처리 내역을 소유주님께 보고하고 있습니다", Comp: LandlordReportScreen },
  { title: "전담팀 처리 현황", note: "전담팀이 사안별로 직접 처리하고 있습니다", Comp: TeamScreen },
];

/**
 * JNP 관리 OS 코드 목업 — 영상처럼 여러 화면이 순환된다.
 * 정산 → 임차인 소통 → 현장 관리 → 서류 → 임대인 보고 → 전담팀.
 * 사진 대신 쓰는 프리미엄 "제품 화면". 하단에 실시간 처리 상태 문구.
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
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
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

        {/* 화면 전환 (페이드) — 고정 높이로 박스 크기 일정 유지 */}
        <div key={i} className="animate-fade-in h-[300px] overflow-hidden">
          <Comp />
        </div>
      </div>

      {/* 실시간 처리 상태 문구 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#F0F2F6] bg-[#FAFBFD]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span key={i} className="animate-fade-in text-[11.5px] font-medium text-foreground/70 truncate">{active.note}</span>
      </div>
    </div>
  );
}
