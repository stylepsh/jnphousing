import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ArrowRight, CheckCircle2, CheckCircle, MessageCircle, FileText, MapPin,
  ShieldCheck, TrendingUp, Pin, Calendar, Phone,
  Wrench, Clock, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/company";
import { CountUp } from "@/components/shared/CountUp";
import { DashboardMock } from "@/components/shared/DashboardMock";
import { CoreServicesCarousel } from "@/components/shared/CoreServicesCarousel";
import { LocalBusinessJsonLd } from "@/components/shared/JsonLd";
import { COMPANY_STATS } from "@/lib/constants/stats";

export const metadata: Metadata = {
  title: "JNP주택관리 — 위탁임대·건물관리 전문",
  description:
    "전국 어디든 위탁임대 전문. HUG 대위변제·전세사기·부실 건물 정상화 전문. 운영 32+ 건물 / 480+ 세대. 무료 상담 010-9893-6882",
  keywords: [
    "부천 위탁임대", "부천 주택관리", "위탁임대관리",
    "HUG 대위변제", "전세사기", "보증사고",
    "임대료 수금", "부실 건물 정상화", "공실 관리",
    "JNP주택관리", "제이앤피", "경기 임대관리",
  ],
  openGraph: {
    title: "JNP주택관리 · 위탁임대 전문",
    description: "부천 본점 / HUG 대위변제·전세사기·부실 건물 정상화 / 운영 32+ 건물 · 관리 480+ 세대",
    url: "https://jnphousing.co.kr",
    siteName: "JNP주택관리",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JNP주택관리 · 위탁임대 전문",
    description: "부천 위탁임대 / HUG 대위변제 · 전세사기 · 부실 건물 정상화",
  },
  alternates: { canonical: "https://jnphousing.co.kr" },
};

interface RecentNotice {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  excerpt: string | null;
  is_pinned: boolean;
  published_at: string | null;
  created_at: string;
}

const NEWS_CATEGORY: Record<string, string> = {
  general: "일반", press: "보도", update: "업데이트", holiday: "휴무", important: "중요",
};

// 컬러 아이콘 타일 (기능별 색 — 앱 아이콘 스타일)
const ICON_TONE: Record<string, { tile: string; icon: string }> = {
  blue: { tile: "bg-blue-100", icon: "text-blue-600" },
  teal: { tile: "bg-teal-100", icon: "text-teal-600" },
  violet: { tile: "bg-violet-100", icon: "text-violet-600" },
  emerald: { tile: "bg-emerald-100", icon: "text-emerald-600" },
  amber: { tile: "bg-amber-100", icon: "text-amber-600" },
  rose: { tile: "bg-rose-100", icon: "text-rose-600" },
  indigo: { tile: "bg-indigo-100", icon: "text-indigo-600" },
  sky: { tile: "bg-sky-100", icon: "text-sky-600" },
};

// 경매 고민 섹션 배경 이미지.
// 👉 동양인 40대 남성이 고민하는 4K 실사 사진을 준비해 이 값에 넣으세요.
//    예) public/auction-worry.jpg 에 넣고 "/auction-worry.jpg"
//    또는 외부 URL("https://...jpg"). 비워두면 시네마틱 다크 배경만 표시됩니다.
const WORRY_IMG = "";

async function fetchRecentNotices(): Promise<RecentNotice[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notices_board")
      .select("id, title, slug, category, excerpt, is_pinned, published_at, created_at")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3);
    return (data ?? []) as RecentNotice[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const recentNotices = await fetchRecentNotices();

  return (
    <>
      <LocalBusinessJsonLd />

      {/* ============ HERO — 흰 배경 분할형 ============ */}
      <section className="bg-white border-b border-[#E8EBF0]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* 좌: 텍스트 */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F6FA] border border-[#E8EBF0] text-xs font-medium text-foreground/70 mb-7">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              상담 무료 · 계약 의무 없음
            </div>

            <h1 className="font-bold tracking-tight text-foreground leading-[1.14]" style={{ fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-0.035em" }}>
              혼자 감당하기 힘든 건물,<br />
              <span className="text-primary">이제 JNP가 책임집니다.</span>
            </h1>

            <p className="mt-6 text-base md:text-lg text-foreground/65 leading-relaxed max-w-xl">
              임대인의 골치 아픈 건물을 대신 운영해, 손 안 대고 수익을 받게 해드리는 위탁운영 회사입니다.
              분쟁·HUG·공실·경매까지, <strong className="text-foreground">전담팀이 직접 해결</strong>합니다.
            </p>

            <div className="mt-6">
              <p className="text-xs font-semibold text-foreground/55 mb-2.5">이런 상황, JNP가 해결합니다</p>
              <div className="flex flex-wrap gap-2">
                {["임차인과 분쟁 중", "HUG 대위변제", "불법 점유자", "공실 누적", "건물 슬럼화", "경매 직전", "임차보증금 미반환"].map((k) => (
                  <span key={k} className="text-xs px-2.5 py-1.5 rounded-full bg-[#F4F6FA] border border-[#E8EBF0] text-foreground/70">{k}</span>
                ))}
                <a href="/auction" className="text-xs px-2.5 py-1.5 rounded-full border border-primary/20 text-primary font-semibold hover:bg-primary/5 transition-colors">경매 건물 ›</a>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="tel:01098936882" className="inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-[#15233f] h-12 px-7 rounded-xl text-base font-semibold transition-all">
                <Phone className="h-5 w-5" /> 지금 무료 상담
              </a>
              <a href="#expertise" className="inline-flex items-center justify-center gap-2 bg-white text-foreground border border-[#D9DEE8] hover:bg-[#F4F6FA] h-12 px-7 rounded-xl text-base font-semibold transition-all">
                해결 영역 보기 <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md border-t border-[#E8EBF0] pt-6">
              {[
                { end: COMPANY_STATS.operatedBuildings, suffix: "+", label: "운영 건물" },
                { end: COMPANY_STATS.managedUnits,      suffix: "+", label: "관리 세대" },
                { end: COMPANY_STATS.resolvedDisputes,  suffix: "+", label: "분쟁 해결" },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight text-foreground">
                    <CountUp end={s.end} className="tabular-nums" />{s.suffix}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 우: JNP 관리 OS 화면 (건물 사진 없이 풀 너비) */}
          <div className="relative">
            <DashboardMock className="w-full" />

            {/* 떠있는 수익 배지 (좌하단, 화면 밖으로) */}
            <div className="hidden sm:flex absolute -bottom-5 -left-3 md:-left-5 items-center gap-3 rounded-2xl bg-white border border-[#E8EBF0] shadow-xl shadow-primary/10 px-4 py-3 animate-fade-in">
              <span className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none mb-1">이번 달 임대수익</p>
                <p className="text-base font-bold text-foreground leading-none tabular-nums">+2,500만원 <span className="text-emerald-600 text-xs align-middle">▲</span></p>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              JNP 관리 OS — 정산·민원·서류·시설관리를 한 화면에서 운영
            </p>
          </div>
        </div>
      </section>

      {/* ============ 진입 3분할 (위탁임대 / 주택관리 / 세입자존) ============ */}
      <section className="bg-[#F7F8FB] border-b border-[#E8EBF0] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-bold tracking-tight text-foreground mb-12" style={{ fontSize: "clamp(24px, 3.5vw, 38px)", letterSpacing: "-0.03em" }}>
            어떤 도움이 필요하세요?
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {/* 위탁임대관리 (임대인) */}
            <a href="#expertise" className="group rounded-2xl border border-[#E8EBF0] bg-white p-7 hover:border-primary/40 hover:shadow-lg transition-all duration-300 scroll-mt-20">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-[11px] font-semibold text-primary/60 mb-1">임대인</p>
              <h3 className="font-bold text-lg text-foreground">위탁임대관리</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                공실·수금·명도·정산까지 임대 운영을 통째로 대행. <strong className="text-foreground">맡기면 매달 수익</strong>이 들어옵니다.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                자세히 보기 <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            {/* 주택관리 (시설) */}
            <a href="#facility" className="group rounded-2xl border border-[#E8EBF0] bg-white p-7 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center mb-5">
                <Wrench className="h-6 w-6 text-teal-600" />
              </div>
              <p className="text-[11px] font-semibold text-primary/60 mb-1">건물주</p>
              <h3 className="font-bold text-lg text-foreground">주택관리</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                엘리베이터·청소·전기·소방·급배수·<strong className="text-foreground">건물 하자</strong>까지 시설을 일괄 관리합니다.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                서비스 보기 <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>

            {/* 세입자존 (임차인) */}
            <a href="/tenant/complaint" className="group rounded-2xl border border-[#E8EBF0] bg-white p-7 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center mb-5">
                <MessageCircle className="h-6 w-6 text-violet-600" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">입주민</p>
              <h3 className="font-bold text-lg text-foreground">세입자존</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                입주민이라면 여기서 <strong className="text-foreground">민원·AS 접수</strong>와 공지·서류 확인을 하세요.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-foreground/70">
                민원 접수하기 <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ============ BRAND PROMISE — 네이비 블록 + 대시보드 목업 ============ */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl bg-primary text-white overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center p-8 md:p-12 lg:p-16">
              {/* 카피 (우측) */}
              <div className="lg:order-2">
                <p className="text-sm font-semibold text-white/55 mb-4">약속</p>
                <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
                  건물 한 채를<br />
                  기업처럼 운영합니다.
                </h2>
                <div className="mt-7 space-y-5 text-base md:text-[17px] leading-relaxed text-white/80">
                  <p>
                    JNP주택관리는 단순한 청소·관리 회사가 아닙니다.
                    건물 하나를 <strong className="text-white">소기업처럼</strong> 운영하는 위탁 사업자입니다.
                  </p>
                  <p>
                    시설관리·공실 마케팅·임대료 수금·HUG 대위변제 대응까지 —
                    임대인은 <strong className="text-white">월간 보고서</strong>만 받아보시면 됩니다.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-6">
                  {[
                    { v: "98%", l: "평균 수금률" },
                    { v: "6종", l: "시설관리 직접 운영" },
                    { v: "주 1회", l: "건물관리·정산 보고" },
                  ].map((s) => (
                    <div key={s.l}>
                      <p className="text-2xl font-bold tabular-nums leading-tight">{s.v}</p>
                      <p className="text-xs text-white/55 mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-7">
                  <Link href="/about" className="inline-flex items-center text-sm font-semibold text-white hover:gap-3 transition-all gap-2">
                    회사 철학 더보기 <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* 대시보드 목업 (좌측) */}
              <div className="relative lg:order-1">
                <DashboardMock className="w-full max-w-sm mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 맡기기 전 → 맡긴 후 (전단지) ============ */}
      <section className="bg-[#F7F8FB] border-y border-[#E8EBF0] py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-overline text-primary mb-4">맡기는 순간</p>
            <h2 className="font-bold tracking-tight leading-[1.15] text-foreground" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              건물이 이렇게 달라집니다
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              방치하던 골칫거리에서 <strong className="text-foreground">매달 들어오는 자산</strong>으로.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 items-stretch">
            {/* 맡기기 전 */}
            <div className="rounded-2xl border border-[#E8EBF0] bg-white p-7">
              <p className="text-sm font-bold text-muted-foreground mb-5">맡기기 전</p>
              <ul className="space-y-3.5">
                {[
                  "몇 달째 비어 있는 공실",
                  "쌓여만 가는 관리비·공과금",
                  "안 나가는 세입자, 명도 분쟁",
                  "임차권등기로 손도 못 대는 세대",
                  "무단 점유자 때문에 골치",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] text-foreground/70">
                    <span className="h-5 w-5 rounded-full bg-[#F0F2F6] flex items-center justify-center shrink-0 mt-0.5"><X className="h-3 w-3 text-muted-foreground" /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* 맡긴 후 */}
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-7">
              <p className="text-sm font-bold text-primary mb-5">맡긴 후</p>
              <ul className="space-y-3.5">
                {[
                  "공실 채워 매달 임대료 정산",
                  "관리비 부담 대신 수익 발생",
                  "명도·분쟁 전문 대응으로 해결",
                  "임차권등기 세대까지 운영",
                  "불법 점유 합법 절차로 퇴거",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] font-medium text-foreground">
                    <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 수익 예시 — 먼저 맡겼더니 돈이 들어온다 */}
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 animate-fade-in">
              <p className="text-sm font-semibold text-primary mb-2">방치 건물 수익화 예시</p>
              <p className="text-sm text-muted-foreground">공실 <span className="font-semibold text-foreground">50세대</span> × 월 <span className="font-semibold text-foreground">50만원</span></p>
              <p className="mt-3 text-3xl md:text-4xl font-black text-primary tracking-tight tabular-nums">
                월 <CountUp end={2500} className="tabular-nums" />만원
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">공실을 채워 <strong className="text-foreground">매월 임대료로 정산</strong> — 턴키 운영</p>
            </div>
            <div className="rounded-2xl border border-[#E8EBF0] bg-white p-6 animate-fade-in" style={{ animationDelay: "90ms" }}>
              <p className="text-sm font-semibold text-foreground mb-2">실제 운영 — 인천 박○○ 님</p>
              <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">286세대</span> × 월평균 50만원</p>
              <p className="mt-3 text-3xl md:text-4xl font-black text-foreground tracking-tight tabular-nums">
                월 임대 <CountUp end={286} className="tabular-nums" />세대 규모
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">대형 건물도 <strong className="text-foreground">통째로 맡아</strong> 안정적으로 운영 중</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">※ 수익은 건물 상태·세대수에 따라 다르며, 무료 검토 후 안내드립니다.</p>

          <p className="mt-10 text-center text-lg md:text-xl font-bold text-foreground">
            방치하면 손실, <span className="text-primary">맡기면 매달 수익</span>입니다.
          </p>
        </div>
      </section>

      {/* ============ 내가 얻는 것 (고객 이익 중심) ============ */}
      <section className="bg-white py-24 md:py-32 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl mb-14">
            <p className="text-overline text-primary mb-4">맡기면 달라집니다</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              건물주님이 실제로 얻으시는 것
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              JNP는 임대인의 골치 아픈 건물을 <strong className="text-foreground">대신 운영</strong>해,
              손 안 대고 수익을 받게 해드리는 <strong className="text-foreground">위탁운영 회사</strong>입니다.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Clock,       tone: "sky",     title: "시간을 돌려드립니다", desc: "민원·수금·시설 전화, 더는 안 받으셔도 됩니다. 매월 보고서 한 장만 받으세요." },
              { icon: TrendingUp,  tone: "emerald", title: "실수령액이 오릅니다", desc: "공실을 줄이고 밀린 임대료를 회수해, 손에 들어오는 돈을 늘려드립니다." },
              { icon: ShieldCheck, tone: "amber",   title: "위기도 대신 처리합니다", desc: "HUG 대위변제·경매·세입자 분쟁 같은 어려운 상황까지 직접 해결합니다." },
              { icon: FileText,    tone: "violet",  title: "전부 투명하게 보여드립니다", desc: "매월 사진·정산 내역이 담긴 보고서로, 무엇을 했는지 다 확인하실 수 있습니다." },
            ].map((b) => {
              const Icon = b.icon;
              const t = ICON_TONE[b.tone];
              return (
                <div key={b.title} className="bg-white rounded-2xl p-7 border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-300 group">
                  <div className={`h-12 w-12 rounded-xl ${t.tile} flex items-center justify-center mb-5`}>
                    <Icon className={`h-6 w-6 ${t.icon}`} />
                  </div>
                  <h3 className="font-bold text-lg tracking-tight text-foreground">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 3대 핵심 서비스 (위탁운용 / 주택관리 / 임차인) ============ */}
      <section id="services-core" className="bg-[#F7F8FB] border-y border-[#E8EBF0] py-24 md:py-32 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-overline text-primary mb-4">핵심 서비스</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              건물 하나, JNP가 통째로 맡습니다
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              임대 운용 · 시설관리 · 임차인 응대 — 흩어진 일을 한 회사가 한 번에 책임집니다.
            </p>
          </div>

          {/* 메뉴 앵커 (위탁임대관리 / 주택관리) */}
          <span id="expertise" className="block -mt-24 pt-24" aria-hidden />
          <span id="facility" className="block -mt-24 pt-24" aria-hidden />

          <CoreServicesCarousel />

          {/* 하단 출동 안내 */}
          <p className="mt-10 text-center text-sm text-foreground/55 inline-flex items-center justify-center gap-1.5 w-full">
            <MapPin className="h-3.5 w-3.5" /> 전국 어디든 출동 · 상담 무료 · 계약 의무 없음
          </p>
        </div>
      </section>

      {/* ============ 경매 — 고민하는 임대인 (풀블리드) ============ */}
      <section className="relative bg-[#0c1322] text-white overflow-hidden">
        {/* 배경 이미지 (설정 시) */}
        {WORRY_IMG && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={WORRY_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        )}
        {/* 시네마틱 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1322] via-[#0c1322]/90 to-[#0c1322]/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-28 md:py-40">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-white/55 mb-5 inline-flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" /> 경매 직전 · 방치된 건물
            </p>
            <h2 className="font-bold tracking-tight leading-[1.18]" style={{ fontSize: "clamp(28px, 4.5vw, 50px)", letterSpacing: "-0.03em" }}>
              혼자 감당하기엔<br />너무 무거운 짐입니다.
            </h2>
            <div className="mt-9 space-y-4 text-lg md:text-2xl text-white/80 leading-relaxed font-medium">
              <p>&ldquo;대출 이자도 못 내는데… 어디서 돈을 빌리지?&rdquo;</p>
              <p>&ldquo;임차인들은 전세보증금 돌려달라고 매일 난리인데…&rdquo;</p>
              <p>&ldquo;관리비도 밀려서 건물은 그대로 방치되고 있는데…&rdquo;</p>
            </div>
            <p className="mt-10 text-xl md:text-3xl font-bold leading-snug">
              그 짐, <span className="text-amber-300">JNP가 대신 짊어집니다.</span>
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <a href="tel:01098936882" className="inline-flex items-center justify-center gap-2 bg-white text-[#0c1322] hover:bg-white/90 h-12 px-7 rounded-xl text-base font-bold transition-all">
                <Phone className="h-5 w-5" /> 010-9893-6882 경매 상담
              </a>
              <a href="/auction" className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/25 hover:bg-white/20 h-12 px-7 rounded-xl text-base font-semibold transition-all">
                경매 서비스 보기 <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 경매 건물 전문 서비스 ============ */}
      <section id="auction-service" className="bg-[#F7F8FB] border-y border-[#E8EBF0] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* 좌측: 텍스트 */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8EBF0] text-sm font-medium text-foreground/70 mb-7">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                경매 건물 전문 서비스
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.15] text-foreground">
                경매 진행 중인 건물,<br />
                <span className="text-primary">공실로 손해만</span> 보고 계십니까?
              </h2>
              <div className="mt-7 space-y-4 text-base md:text-lg text-foreground/65 leading-relaxed">
                <p>임차권등기 · HUG 대위변제 · 명도 · 장기 공실 때문에 건물을 사실상 <strong className="text-foreground">방치</strong>하고 계신 임대인분들이 많습니다.</p>
                <p>하지만 경매가 진행 중이라고 해서 반드시 <strong className="text-foreground">수익 창출이 불가능한 것은 아닙니다.</strong></p>
              </div>
              <div className="mt-7 p-5 rounded-xl bg-white border border-[#E8EBF0]">
                <p className="text-primary font-semibold text-lg mb-2">&quot;어차피 경매 넘어갈 건데...&quot;</p>
                <p className="text-muted-foreground text-sm leading-relaxed">방치하는 동안에도 관리비·공과금·청소비는 매달 발생합니다. <strong className="text-foreground">생각보다 큰 손실</strong>이 될 수 있습니다.</p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="tel:01098936882" className="inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-[#15233f] h-12 px-7 rounded-xl text-base font-semibold transition-all">
                  <Phone className="h-5 w-5" /> 010-9893-6882
                </a>
                <a href="/auction" className="inline-flex items-center justify-center gap-2 bg-white text-foreground border border-[#D9DEE8] hover:bg-[#F4F6FA] h-12 px-7 rounded-xl text-base font-semibold transition-all">
                  자세히 보기 <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">※ 건물 주소·연락처를 문자로 남겨주시면 검토 후 연락드립니다.</p>
            </div>

            {/* 우측: 체크리스트 카드 */}
            <div className="bg-white rounded-2xl border border-[#E8EBF0] p-8 md:p-10 shadow-sm">
              <h3 className="text-foreground text-xl font-bold mb-6">이런 건물을 전문적으로 검토합니다</h3>
              <div className="space-y-3">
                {[
                  { t: "임차권등기 세대가 많은 건물", d: "등기 정리와 임차인 관리를 동시에" },
                  { t: "HUG 대위변제 진행 건물", d: "보증사고 이후 자산 정리 전문" },
                  { t: "공실이 다수 발생한 건물", d: "낙찰 전까지 공실 수익화" },
                  { t: "관리가 어려운 건물", d: "명도·시설·세입자 문제 종합 대응" },
                  { t: "경매 진행 중인 건물", d: "낙찰 전 기간 동안 수익 극대화" },
                ].map((c) => (
                  <div key={c.t} className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F8FB] border border-[#E8EBF0]">
                    <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">{c.t}</p>
                      <p className="text-muted-foreground text-sm mt-0.5">{c.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 pt-5 border-t border-[#E8EBF0]">
                <p className="text-foreground/70 text-sm leading-relaxed">이미 포기하셨던 건물이라도 <strong className="text-foreground">한 번쯤은 확인해 보시기 바랍니다.</strong></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 고객 후기 ============ */}
      <section className="bg-[#F8FAFF] py-24 md:py-32 border-y border-border/40">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-overline text-primary mb-4">고객 후기</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              실제 건물주님들의 이야기
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                initial: "K", who: "부천 중동 김○○ 님", result: "공실률 40% → 12% 개선",
                msgs: [
                  { r: "owner", t: "HUG 대위변제 통보를 받았는데… 뭘 해야 할지 막막해요." },
                  { r: "jnp", t: "통보서부터 같이 보겠습니다. 처음부터 끝까지 동행해 드릴게요." },
                  { r: "owner", t: "건물 포기해야 하나 싶었거든요." },
                  { r: "jnp", t: "포기 안 하셔도 됩니다. 임차인 정리·재임대까지 저희가 맡습니다 🙂" },
                  { r: "owner", t: "덕분에 건물 지켰습니다. 정말 감사합니다 🙏" },
                ],
              },
              {
                initial: "P", who: "서울 관악구 박○○ 님", result: "수금률 60% → 95% 개선",
                msgs: [
                  { r: "owner", t: "3년째 공실이에요… 이런 건물도 가능할까요?" },
                  { r: "jnp", t: "단계적 수선 + 다채널 광고로 충분히 가능합니다." },
                  { r: "owner", t: "광고를 올려도 문의가 없었거든요." },
                  { r: "jnp", t: "채널·가격 전략부터 다시 잡겠습니다. 4개월 목표로 가보시죠." },
                  { r: "owner", t: "정말 4개월 만에 다 찼어요. 매월 보고서까지 받으니 안심돼요." },
                ],
              },
              {
                initial: "L", who: "인천 부평 이○○ 님", result: "분쟁 해결 완료 · 2개월",
                msgs: [
                  { r: "owner", t: "세입자 분쟁 때문에 잠을 못 자요…" },
                  { r: "jnp", t: "현장 중재부터 법적 절차 안내까지 저희가 맡습니다." },
                  { r: "owner", t: "직접 연락하는 게 너무 스트레스였어요." },
                  { r: "jnp", t: "이제 연락은 저희한테 오게 하세요. 사장님은 결과만 받으시면 됩니다." },
                  { r: "owner", t: "2개월 만에 정리됐어요. 살 것 같습니다." },
                ],
              },
              {
                initial: "J", who: "서울 양천 정○○ 님", result: "방치 → 매월 임대수익 발생",
                msgs: [
                  { r: "owner", t: "경매 넘어갈 건물인데… 그냥 비워두고 있어요." },
                  { r: "jnp", t: "낙찰 전까지도 수익화 가능합니다. 방치하면 관리비만 나가요." },
                  { r: "owner", t: "어차피 넘어갈 텐데 의미가 있나요?" },
                  { r: "jnp", t: "그 기간을 수익으로 바꿔드립니다. 우선 무료로 검토해 드릴게요." },
                  { r: "owner", t: "맡기고 나서 매달 입금이 들어와서 놀랐습니다." },
                ],
              },
              {
                initial: "C", who: "경기 부천 최○○ 님", result: "명도 완료 + 재임대",
                msgs: [
                  { r: "owner", t: "무단 점유자가 안 나가요. 어떻게 하죠?" },
                  { r: "jnp", t: "제휴 법무사와 함께 합법 절차로 신속히 정리해 드립니다." },
                  { r: "owner", t: "괜히 분쟁이 커질까 겁났어요." },
                  { r: "jnp", t: "안전하게 진행하니 걱정 마세요. 명도 후 재임대까지 맡겠습니다." },
                  { r: "owner", t: "깔끔하게 정리되고 새 임차인까지 들어왔어요." },
                ],
              },
              {
                initial: "H", who: "서울 성북 한○○ 님", result: "민원·시설 일괄 위탁",
                msgs: [
                  { r: "owner", t: "누수·보일러·청소… 연락 올 때마다 제가 뛰어다녀요." },
                  { r: "jnp", t: "시설·하자·청소 전부 저희가 맡습니다. 월 보고서만 받으세요." },
                  { r: "owner", t: "한밤중 민원 전화가 제일 힘들었어요." },
                  { r: "jnp", t: "이제 입주민 민원도 저희 창구로 받습니다 🙂" },
                  { r: "owner", t: "전화에서 해방됐어요. 진작 맡길걸 그랬습니다." },
                ],
              },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-[#E8EBF0] shadow-md bg-white animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                {/* 카톡 채팅방 헤더 */}
                <div className="flex items-center gap-2.5 px-4 py-3 bg-[#9DB2CA]">
                  <div className="h-9 w-9 rounded-2xl bg-white flex items-center justify-center text-xs font-bold text-primary shadow-sm">{t.initial}</div>
                  <div className="leading-tight min-w-0">
                    <p className="text-[13px] font-bold text-[#16233c] truncate">{t.who}</p>
                    <p className="text-[10px] text-[#16233c]/55">JNP주택관리와의 대화</p>
                  </div>
                  <span className="ml-auto text-[#16233c]/40 text-lg leading-none">☰</span>
                </div>
                {/* 대화 — JNP 노랑(우), 소유주 흰색(좌) */}
                <div className="bg-[#B2C7DA] px-3 py-4 space-y-2">
                  <div className="flex justify-center pb-1.5">
                    <span className="text-[10px] text-[#16233c]/60 bg-white/45 rounded-full px-3 py-0.5">상담 시작</span>
                  </div>
                  {t.msgs.map((m, j) => {
                    const time = `오후 2:${(11 + j).toString().padStart(2, "0")}`;
                    const last = j === t.msgs.length - 1;
                    return m.r === "owner" ? (
                      <div key={j} className="flex items-end gap-1.5">
                        <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-primary shrink-0 self-start shadow-sm">{t.initial}</div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-[13px] leading-snug text-foreground shadow-sm max-w-[74%]">{m.t}</div>
                        <span className="text-[9px] text-[#16233c]/50 shrink-0 mb-0.5">{time}</span>
                      </div>
                    ) : (
                      <div key={j} className="flex items-end justify-end gap-1">
                        <div className="flex flex-col items-end shrink-0 mb-0.5">
                          {last && <span className="text-[9px] font-semibold text-[#4a6da3]">읽음</span>}
                          <span className="text-[9px] text-[#16233c]/50">{time}</span>
                        </div>
                        <div className="bg-[#FEE500] rounded-2xl rounded-tr-sm px-3 py-2 text-[13px] leading-snug text-[#3C1E1E] shadow-sm max-w-[74%]">{m.t}</div>
                      </div>
                    );
                  })}
                </div>
                {/* 결과 */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-t border-[#E8EBF0]">
                  <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground/70">{t.result}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            * 실제 상담 내용을 바탕으로 재구성했으며, 개인정보 보호를 위해 이니셜로 표기합니다.
          </p>
        </div>
      </section>


      {/* ============ 5단계 프로세스 ============ */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <p className="text-overline text-primary mb-4">진행 절차</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              위탁관리 5단계 절차
            </h2>
          </div>

          {/* 데스크톱: 가로 진행 + 연결선 */}
          <div className="hidden md:block relative">
            <div className="absolute top-7 left-[10%] right-[10%] h-0.5 bg-primary/15" />
            <div className="grid grid-cols-5 gap-3 relative">
              {[
                { step: "01", title: "문의 접수",  desc: "전화·카톡·온라인 폼 청취" },
                { step: "02", title: "현장 실사",  desc: "건물·세대·임차인 종합 점검" },
                { step: "03", title: "위탁 계약",  desc: "수수료·범위·기간 명문화" },
                { step: "04", title: "관리 운영",  desc: "수금·민원·공실·분쟁 일괄 대응" },
                { step: "05", title: "월 정산",    desc: "수익·지출·진행상황 보고서 발송" },
              ].map((s, i) => (
                <div key={s.step} className="text-center animate-fade-in group" style={{ animationDelay: `${i * 130}ms` }}>
                  <div className="mx-auto h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center font-bold relative z-10 mb-5 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-base mb-2 transition-colors group-hover:text-primary">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 모바일: 세로 진행 */}
          <div className="md:hidden space-y-4">
            {[
              { step: "01", title: "문의 접수",  desc: "전화·카톡·온라인 폼 청취" },
              { step: "02", title: "현장 실사",  desc: "건물·세대·임차인 종합 점검" },
              { step: "03", title: "위탁 계약",  desc: "수수료·범위·기간 명문화" },
              { step: "04", title: "관리 운영",  desc: "수금·민원·공실·분쟁 일괄 대응" },
              { step: "05", title: "월 정산",    desc: "수익·지출·진행상황 보고서 발송" },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div className="flex-1 pb-2">
                  <h3 className="font-bold text-base">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA — 무료 보장 3종 */}
          <div className="mt-16 text-center space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="tel:01098936882" className="inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary/90 h-14 px-8 rounded-xl text-lg font-semibold transition-all hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5">
                <Phone className="h-5 w-5" /> 지금 바로 전화하기
              </a>
              <a href="https://open.kakao.com/o/scZWs5vi" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FDD800] h-14 px-8 rounded-xl text-lg font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5">
                <MessageCircle className="h-5 w-5" /> 카카오톡 상담하기
              </a>
            </div>
            <p className="text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> 상담 후 계약 의무 없음</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> 현장 진단 무료</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> 견적 무료</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============ 최근 공지사항 (데이터 있을 때만) ============ */}
      {recentNotices.length > 0 && (
        <section className="bg-[#f5f7fb] py-20 border-y border-border/40">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
              <div>
                <p className="text-overline text-primary mb-3">최근 소식</p>
                <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-0.025em" }}>
                  공지사항
                </h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/news">전체 보기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4 stagger-children">
              {recentNotices.map((n) => {
                const dateStr = (n.published_at ?? n.created_at).slice(0, 10).replace(/-/g, ".");
                const href = `/news/${n.slug ?? n.id}`;
                return (
                  <Link key={n.id} href={href} className="block">
                    <Card className="h-full hover:shadow-md transition-all animate-fade-in border-border/40">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          {n.is_pinned && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                              <Pin className="h-2.5 w-2.5 mr-0.5" /> 고정
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {NEWS_CATEGORY[n.category] ?? n.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                            <Calendar className="h-2.5 w-2.5" /> {dateStr}
                          </span>
                        </div>
                        <h3 className="font-bold text-base line-clamp-2">{n.title}</h3>
                        {n.excerpt && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {n.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ 부동산 파트너 CTA ============ */}
      <section className="bg-white border-t border-[#E8EBF0] py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-overline text-primary mb-4">부동산 파트너</p>
          <h2 className="font-bold tracking-tight leading-[1.15] text-foreground" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
            공실 매물 정보,<br className="md:hidden" />
            부동산 회원께 실시간 공개합니다
          </h2>
          <p className="mt-6 text-base md:text-lg text-foreground/65 max-w-2xl mx-auto leading-relaxed">
            JNP 관리 건물의 실시간 공실 현황을 가입 후 바로 열람.
            <br className="hidden md:block" />
            보증금·월세·이미지·상세 정보까지 모두 제공됩니다.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="h-12 px-7 font-semibold">
              <Link href="/agency/signup">부동산 가입 신청 <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 font-semibold">
              <Link href="/agency/login">기존 회원 로그인</Link>
            </Button>
          </div>

          <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              "실시간 공실 현황",
              "보증금·월세 즉시 확인",
              "이미지·상세 정보 제공",
            ].map((t) => (
              <div key={t} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 최종 CTA (푸터 바로 위) ============ */}
      <section className="bg-primary text-white py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-6 text-center relative">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            지금 전화 한 통이<br />
            건물의 미래를 바꿉니다.
          </h2>
          <p className="mt-6 text-lg text-white/80 leading-relaxed max-w-xl mx-auto">
            67건 이상의 위기 건물을 정상화한 JNP주택관리.<br />
            상담은 무료이며, 계약 의무는 없습니다.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:01098936882" className="inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-white/90 h-14 px-8 rounded-xl text-lg font-bold transition-all hover:shadow-2xl hover:-translate-y-0.5">
              <Phone className="h-5 w-5" /> 010-9893-6882
            </a>
            <a href="/contact" className="inline-flex items-center justify-center gap-2 bg-white/15 text-white border border-white/30 hover:bg-white/25 h-14 px-8 rounded-xl text-lg font-semibold transition-all">
              온라인 문의하기 <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 평일 09:00~18:00</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> 전국 어디든 출동</span>
          </div>
        </div>
      </section>
    </>
  );
}
