import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ArrowRight, CheckCircle2, CheckCircle, MessageCircle, FileText, MapPin,
  ShieldCheck, TrendingUp, Pin, Calendar, Phone,
  Wrench, Wifi, Sparkles, Zap, Droplets, Flame, ArrowUpDown, Clock, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/company";
import { CountUp } from "@/components/shared/CountUp";
import { BeforeAfterCard } from "@/components/shared/BeforeAfterCard";
import { LocalBusinessJsonLd } from "@/components/shared/JsonLd";
import { COMPANY_STATS } from "@/lib/constants/stats";
import { TRANSFORMATIONS } from "@/lib/data/transformations";
import { HERO_IMAGES, SAMPLE_PROPERTIES, CATEGORY_IMAGES } from "@/lib/data/site-images";
import type { Property } from "@/types/database";

export const metadata: Metadata = {
  title: "JNP주택관리 — 위탁임대·건물관리 전문",
  description:
    "부천·경기·서울·인천 위탁임대 전문. HUG 대위변제·전세사기·부실 건물 정상화 전문. 운영 32+ 건물 / 480+ 세대. 무료 상담 010-7508-6916",
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

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔", apartment: "아파트", villa: "빌라", commercial: "상가",
};

async function fetchTopProperties(): Promise<Property[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .limit(6);
    return (data ?? []) as Property[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [properties, recentNotices] = await Promise.all([
    fetchTopProperties(),
    fetchRecentNotices(),
  ]);

  return (
    <>
      <LocalBusinessJsonLd />

      {/* ============ HERO — 흰 배경 분할형 ============ */}
      <section className="bg-white border-b border-[#E8EBF0]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["HUG 대위변제", "악성 세입자", "공실 누적", "임대료 연체"].map((k) => (
                <span key={k} className="text-xs px-2.5 py-1 rounded-full bg-[#F4F6FA] border border-[#E8EBF0] text-foreground/60">{k}</span>
              ))}
              <a href="/auction" className="text-xs px-2.5 py-1 rounded-full border border-primary/20 text-primary font-semibold hover:bg-primary/5 transition-colors">경매 건물 ›</a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="tel:01075086916" className="inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-[#15233f] h-12 px-7 rounded-xl text-base font-semibold transition-all">
                <Phone className="h-5 w-5" /> 지금 무료 상담
              </a>
              <a href="#transformation" className="inline-flex items-center justify-center gap-2 bg-white text-foreground border border-[#D9DEE8] hover:bg-[#F4F6FA] h-12 px-7 rounded-xl text-base font-semibold transition-all">
                해결 사례 보기 <ArrowRight className="h-4 w-4" />
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

          {/* 우: 이미지 */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGES.primary}
              alt="JNP주택관리가 운영하는 주거 건물"
              className="rounded-3xl w-full aspect-[5/4] object-cover border border-[#E8EBF0]"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* ============ 진입 3분할 (위탁임대 / 주택관리 / 세입자존) ============ */}
      <section className="bg-[#F7F8FB] border-b border-[#E8EBF0] py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold text-foreground/70 mb-7">어떤 도움이 필요하세요?</p>
          <div className="grid md:grid-cols-3 gap-4">
            {/* 위탁임대관리 (임대인) */}
            <a href="#expertise" className="group rounded-2xl border border-[#E8EBF0] bg-white p-7 hover:border-primary/40 hover:shadow-lg transition-all duration-300 scroll-mt-20">
              <div className="h-12 w-12 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <Building2 className="h-6 w-6 text-primary" />
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
              <div className="h-12 w-12 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <Wrench className="h-6 w-6 text-primary" />
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
              <div className="h-12 w-12 rounded-xl bg-[#F0F2F6] flex items-center justify-center mb-5 group-hover:bg-[#E6E9EF] transition-colors">
                <MessageCircle className="h-6 w-6 text-foreground/70" />
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

      {/* ============ BRAND PROMISE ============ */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-overline text-primary mb-4">약속</p>
              <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
                건물 한 채를<br />
                기업처럼 운영합니다.
              </h2>
            </div>
            <div className="space-y-6 text-base md:text-[17px] leading-relaxed text-foreground/85">
              <p>
                JNP주택관리는 단순한 청소·관리 회사가 아닙니다.
                건물 하나를 <strong className="text-foreground">소기업처럼</strong> 운영하는 위탁 사업자입니다.
              </p>
              <p>
                전기·통신·청소·소방·승강기·급배수 6종 시설관리부터
                공실 마케팅, 임대료 수금, HUG 대위변제 대응까지 — 임대인은
                <strong className="text-foreground"> 월간 보고서</strong>만 받아보시면 됩니다.
              </p>
              <div className="pt-4">
                <Link href="/about" className="inline-flex items-center text-sm font-semibold text-primary hover:gap-3 transition-all gap-2">
                  회사 철학 더보기 <ArrowRight className="h-4 w-4" />
                </Link>
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
              { icon: Clock,       title: "시간을 돌려드립니다", desc: "민원·수금·시설 전화, 더는 안 받으셔도 됩니다. 매월 보고서 한 장만 받으세요." },
              { icon: TrendingUp,  title: "실수령액이 오릅니다", desc: "공실을 줄이고 밀린 임대료를 회수해, 손에 들어오는 돈을 늘려드립니다." },
              { icon: ShieldCheck, title: "위기도 대신 처리합니다", desc: "HUG 대위변제·경매·세입자 분쟁 같은 어려운 상황까지 직접 해결합니다." },
              { icon: FileText,    title: "전부 투명하게 보여드립니다", desc: "매월 사진·정산 내역이 담긴 보고서로, 무엇을 했는지 다 확인하실 수 있습니다." },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="bg-white rounded-2xl p-7 border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg tracking-tight text-foreground">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 6종 시설관리 카테고리 — 실제 이미지 ============ */}
      <section id="facility" className="bg-white py-24 md:py-32 border-y border-border/40 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-overline text-primary mb-4">시설관리 서비스</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              건물 운영의 모든 영역
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              6종 시설관리 카테고리. 외부 업체 위탁 없이 JNP가 직접 책임집니다.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {Object.entries(CATEGORY_IMAGES).map(([key, c], idx) => {
              const Icon = [Wifi, Sparkles, Zap, Droplets, Flame, ArrowUpDown][idx] ?? Building2;
              return (
                <div key={key} className="bg-white rounded-2xl p-6 md:p-7 border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-300 group animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="h-14 w-14 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">0{idx + 1}</p>
                  <h3 className="font-bold text-lg tracking-tight text-foreground">{c.label}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.description}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-sm text-foreground/55">
            6종 카테고리 외 추가 운영 가능 — <Link href="/services" className="underline hover:text-primary">전체 서비스 보기</Link>
          </p>
        </div>
      </section>

      {/* ============ 관리현장 — 실제 빌딩 사진 ============ */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between gap-4 mb-14 flex-wrap">
            <div>
              <p className="text-overline text-primary mb-4">관리 현장</p>
              <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
                JNP가 운영하는 건물
              </h2>
            </div>
            <Button asChild variant="ghost" className="font-semibold">
              <Link href="/properties">전체 보기 <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>

          {(() => {
            const cards = properties.length === 0
              ? SAMPLE_PROPERTIES.map((p, idx) => ({ key: String(idx), href: "/properties", name: p.name, type: p.type, loc: p.region, units: p.units }))
              : properties.map((p) => ({ key: p.id, href: `/properties/${p.id}`, name: p.name, type: p.type, loc: p.address ?? "", units: p.total_units }));
            return (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
                {cards.map((p) => (
                  <Link key={p.key} href={p.href} className="block animate-fade-in group">
                    <div className="h-full rounded-2xl border border-[#E8EBF0] bg-white p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-5">
                        <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#F4F6FA] border border-[#E8EBF0] text-xs font-semibold text-foreground/60">
                          {PROPERTY_TYPE_LABEL[p.type] ?? p.type}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg tracking-tight text-foreground">{p.name}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        {p.loc && (
                          <span className="inline-flex items-center gap-1 line-clamp-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" /> {p.loc}
                          </span>
                        )}
                        {p.loc && <span>·</span>}
                        <span className="shrink-0">{p.units}세대</span>
                      </div>
                      <div className="mt-5 pt-4 border-t border-[#F0F2F6] flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">JNP 위탁 운영 중</span>
                        <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ============ 위탁임대 — 위기 자산 회복 ============ */}
      <section id="expertise" className="bg-[#F7F8FB] text-foreground py-24 md:py-32 relative overflow-hidden scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 relative">
          <div className="max-w-2xl mb-16">
            <p className="text-overline text-primary mb-4">전문 해결 영역</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              위기 자산을 정상화하는 6가지 전문 영역
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              일반 관리회사가 손대지 않는 영역. JNP가 직접 해결합니다.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { tag: "긴급",    title: "HUG 대위변제 대응",       desc: "보증보험 사고 이후 자산 정리·임차인 정리·후속 절차 동행" },
              { tag: "정상화",  title: "부실 건물 회복",          desc: "수익이 안 나오는 빈 건물을 단계적 수선 + 임차인 매칭으로 회복" },
              { tag: "중재",    title: "세입자 분쟁 해결",        desc: "이러지도 저러지도 못하는 임차인 갈등을 현장 중재 + 법적 절차 안내로 정리" },
              { tag: "현금흐름", title: "임차 수익 흐름화",        desc: "소유권은 있지만 운영이 막힌 자산을 안정적 임대 수익으로 전환" },
              { tag: "법무동행", title: "변호사·법무 자문",        desc: "변호사비 부담 없이 시작. 실제 자문 네트워크 함께 동원" },
              { tag: "경험",    title: "현장 실전 조언", desc: "교과서가 아닌 현장에서 쌓은 노하우. 케이스별 최적의 다음 한 수" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-blue-100 rounded-2xl p-7 md:p-8 hover:shadow-xl hover:border-primary/40 transition-all duration-300">
                <p className="text-[11px] font-semibold text-primary/60 mb-3">0{i + 1} · {s.tag}</p>
                <h3 className="font-bold text-lg md:text-xl tracking-tight text-foreground">{s.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-8 rounded-2xl bg-primary/5 border border-primary/20">
            <div>
              <p className="text-lg font-semibold text-foreground">자산 운영이 막혀 있다면, 망설이지 마세요.</p>
              <p className="text-sm text-muted-foreground mt-1.5 inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {COMPANY.serviceArea} 전 지역 출동 가능
              </p>
            </div>
            <Button asChild size="lg" className="bg-primary text-white hover:bg-primary/90 font-semibold whitespace-nowrap">
              <a href={COMPANY.contact.phoneHref}>
                <Phone className="h-4 w-4 mr-2" /> {COMPANY.contact.phone}
              </a>
            </Button>
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

      {/* ============ Before/After ============ */}
      <section id="transformation" className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-overline text-primary mb-4">정상화 실적</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              위기 건물의 정상화 결과
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              실제 운영 데이터로 확인된 변화. 공실률·수금률·민원 처리속도 등 핵심 지표 개선.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {TRANSFORMATIONS.map(t => (
              <div key={t.id} className="animate-fade-in">
                <BeforeAfterCard t={t} />
              </div>
            ))}
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
              <div key={i} className="rounded-2xl overflow-hidden border border-[#E8EBF0] shadow-sm bg-white animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                {/* 채팅방 헤더 */}
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#A7BBD0]">
                  <div className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center text-xs font-bold text-primary">{t.initial}</div>
                  <span className="text-sm font-semibold text-[#1c2b4a]">{t.who}</span>
                </div>
                {/* 대화 — JNP 노랑(우), 소유주 흰색(좌) */}
                <div className="bg-[#B2C7DA] px-3.5 py-4 space-y-2.5">
                  {t.msgs.map((m, j) => m.r === "owner" ? (
                    <div key={j} className="flex items-end gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-[9px] font-bold text-primary shrink-0">{t.initial}</div>
                      <div className="max-w-[78%] bg-white rounded-2xl rounded-bl-md px-3 py-2 text-[13px] leading-snug text-foreground shadow-sm">{m.t}</div>
                    </div>
                  ) : (
                    <div key={j} className="flex justify-end">
                      <div className="max-w-[80%] bg-[#FEE500] rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-snug text-[#3C1E1E] shadow-sm">{m.t}</div>
                    </div>
                  ))}
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
              <a href="tel:01075086916" className="inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary/90 h-14 px-8 rounded-xl text-lg font-semibold transition-all hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5">
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
            <a href="tel:01075086916" className="inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-white/90 h-14 px-8 rounded-xl text-lg font-bold transition-all hover:shadow-2xl hover:-translate-y-0.5">
              <Phone className="h-5 w-5" /> 010-7508-6916
            </a>
            <a href="/contact" className="inline-flex items-center justify-center gap-2 bg-white/15 text-white border border-white/30 hover:bg-white/25 h-14 px-8 rounded-xl text-lg font-semibold transition-all">
              온라인 문의하기 <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 평일 09:00~18:00</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> 경기·서울·인천 전 지역</span>
          </div>
        </div>
      </section>
    </>
  );
}
