import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ArrowRight, CheckCircle2, CheckCircle, MessageCircle, FileText, MapPin,
  ShieldCheck, TrendingUp, Megaphone, Pin, Calendar, Phone, Wallet, Wrench, Gavel,
  Wifi, Sparkles, Zap, Droplets, Flame, ArrowUpDown, Star, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/company";
import { CountUp } from "@/components/shared/CountUp";
import { CaseCarousel } from "@/components/shared/CaseCarousel";
import { BeforeAfterCard } from "@/components/shared/BeforeAfterCard";
import { LocalBusinessJsonLd } from "@/components/shared/JsonLd";
import { COMPANY_STATS } from "@/lib/constants/stats";
import { CASE_STUDIES } from "@/lib/data/cases";
import { TRANSFORMATIONS } from "@/lib/data/transformations";
import { HERO_IMAGES, SAMPLE_PROPERTIES, CATEGORY_IMAGES, CTA_IMAGE } from "@/lib/data/site-images";
import type { Property } from "@/types/database";

export const metadata: Metadata = {
  title: "JNP주택관리 — 위탁임대·건물관리 전문 27년차",
  description:
    "부천·경기·서울·인천 위탁임대 27년. HUG 대위변제·전세사기·부실 건물 정상화 전문. 운영 32+ 건물 / 480+ 세대. 무료 상담 010-7508-6916",
  keywords: [
    "부천 위탁임대", "부천 주택관리", "위탁임대관리",
    "HUG 대위변제", "전세사기", "보증사고",
    "임대료 수금", "부실 건물 정상화", "공실 관리",
    "JNP주택관리", "제이앤피", "경기 임대관리",
  ],
  openGraph: {
    title: "JNP주택관리 · 위탁임대 27년 전문",
    description: "부천 본점 / HUG 대위변제·전세사기·부실 건물 정상화 / 운영 32+ 건물 · 관리 480+ 세대",
    url: "https://jnphousing.co.kr",
    siteName: "JNP주택관리",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JNP주택관리 · 위탁임대 27년 전문",
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

      {/* ============ HERO — 풀스크린 빌딩 이미지 ============ */}
      <section className="relative min-h-[680px] md:min-h-[820px] flex items-center text-white overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGES.primary}
          alt="JNP주택관리가 운영하는 모던 주거 건물"
          className="absolute inset-0 w-full h-full object-cover"
          fetchPriority="high"
        />
        {/* 블루 그라데이션 오버레이 — 대기업 신뢰감 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B4DDB]/90 via-[#2563EB]/75 to-[#3B82F6]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1340B8]/75 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl w-full px-6 py-24 md:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-xs font-medium tracking-wide mb-8 animate-fade-in">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              상담 무료 · 계약 의무 없음
            </div>

            <h1
              className="font-bold tracking-tighter leading-[1.08] animate-fade-in"
              style={{
                fontSize: "clamp(34px, 6.5vw, 68px)",
                letterSpacing: "-0.035em",
                fontFeatureSettings: '"ss01"',
              }}
            >
              혼자 감당하기 힘든 건물,<br />
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">이제 JNP가 책임집니다.</span>
            </h1>

            {/* 서브카피 — 키워드 인라인 뱃지 + 한 줄 */}
            <div className="mt-7 max-w-2xl animate-fade-in" style={{ animationDelay: "120ms" }}>
              <div className="flex flex-wrap gap-2">
                {["HUG 대위변제", "악성 세입자", "공실 누적", "임대료 연체"].map((k) => (
                  <span key={k} className="text-sm bg-white/10 rounded-full px-2.5 py-0.5 text-white/85">{k}</span>
                ))}
                <a href="/auction" className="text-sm bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-full px-2.5 py-0.5 font-bold hover:bg-amber-400/30 transition-colors">경매 건물</a>
              </div>
              <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed">
                27년 현장 경험으로, 포기하고 싶었던 건물을 다시 살립니다.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: "240ms" }}>
              <a href="tel:01075086916" className="inline-flex items-center justify-center gap-2 bg-white text-[#1B4DDB] hover:bg-blue-50 h-14 px-7 rounded-xl text-base font-bold transition-all hover:shadow-2xl hover:-translate-y-0.5">
                <Phone className="h-5 w-5" /> 지금 무료 상담
              </a>
              <a href="#transformation" className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/30 hover:bg-white/20 h-14 px-7 rounded-xl text-base font-semibold transition-all">
                해결 사례 보기 <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* 신뢰 배지 한 줄 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-8 text-xs text-white/65 animate-fade-in" style={{ animationDelay: "300ms" }}>
              <span>🏢 운영 건물 {COMPANY_STATS.operatedBuildings}+</span>
              <span>👨‍👩‍👧‍👦 관리 세대 {COMPANY_STATS.managedUnits}+</span>
              <span>⚖️ 분쟁 해결 {COMPANY_STATS.resolvedDisputes}+</span>
              <span>📅 경력 {COMPANY.yearsOfExperience}년</span>
            </div>
          </div>

          {/* 통계 그리드 — 모바일 2x2, 카운트업 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-16 md:mt-24 max-w-4xl animate-fade-in" style={{ animationDelay: "360ms" }}>
            {[
              { end: COMPANY_STATS.operatedBuildings, suffix: "+", label: "운영 건물" },
              { end: COMPANY_STATS.managedUnits,      suffix: "+", label: "관리 세대" },
              { end: COMPANY_STATS.resolvedDisputes,  suffix: "+", label: "해결 분쟁" },
              { end: COMPANY.yearsOfExperience,       suffix: "년", label: "운영 경력" },
            ].map((s, i) => (
              <div key={i} className="border-l-2 border-white/20 pl-4">
                <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">
                  <CountUp end={s.end} className="tabular-nums" />{s.suffix}
                </p>
                <p className="text-[11px] md:text-xs text-white/60 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 페이드 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
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

      {/* ============ 이런 고민이 있으신가요? (공감) ============ */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-overline text-primary mb-4">고객의 고민</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              이런 고민이 있으신가요?
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              임대인이라면 누구나 겪는 문제들. JNP가 대신 맡아 해결합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Building2, title: "장기 공실", quote: "공실이 몇 달째 그대로예요. 광고를 올려도 문의가 없어요." },
              { icon: Wallet, title: "월세 연체·수금", quote: "월세가 자꾸 밀려요. 매번 독촉 전화하기도 지칩니다." },
              { icon: Wrench, title: "끝없는 시설관리", quote: "누수·보일러·청소… 연락 올 때마다 직접 뛰어다녀요." },
              { icon: MessageCircle, title: "세입자 민원", quote: "한밤중에도 민원 전화가 와요. 일상이 안 됩니다." },
              { icon: ShieldCheck, title: "HUG 보증사고", quote: "HUG 대위변제 통보가 왔는데, 뭘 해야 할지 모르겠어요." },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="bg-white rounded-2xl p-7 border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">&quot;{c.quote}&quot;</p>
                </div>
              );
            })}

            {/* 6번 — 경매 건물 (전문 서비스, 앰버 차별화) */}
            <a href="/auction" className="bg-white rounded-2xl p-7 border border-amber-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 group cursor-pointer relative overflow-hidden block">
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">전문 서비스</span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Gavel className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">경매 건물 공실 방치</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                &quot;어차피 경매 넘어갈 건데... 공실을 그냥 놔두고 있어요. 매달 비용만 나가요.&quot;
              </p>
              <span className="mt-4 text-sm font-semibold text-amber-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                전문 상담 받기 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ============ 6종 시설관리 카테고리 — 실제 이미지 ============ */}
      <section className="bg-white py-24 md:py-32 border-y border-border/40">
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

          {properties.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {SAMPLE_PROPERTIES.map((p, idx) => (
                <Link key={idx} href="/properties" className="block animate-fade-in">
                  <div className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-2.5 py-1 rounded-full bg-white/95 text-xs font-semibold text-[#0a1730] backdrop-blur">
                        {PROPERTY_TYPE_LABEL[p.type] ?? p.type}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="font-bold text-xl tracking-tight">{p.name}</h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-white/85">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.region}
                        </span>
                        <span>•</span>
                        <span>{p.units}세대</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {properties.map((p, idx) => (
                <Link key={p.id} href={`/properties/${p.id}`} className="block animate-fade-in">
                  <div className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900">
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnail_url}
                        alt={p.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={SAMPLE_PROPERTIES[idx % SAMPLE_PROPERTIES.length].image}
                        alt={p.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-2.5 py-1 rounded-full bg-white/95 text-xs font-semibold text-[#0a1730] backdrop-blur">
                        {PROPERTY_TYPE_LABEL[p.type] ?? p.type}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="font-bold text-xl tracking-tight">{p.name}</h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-white/85">
                        {p.address && (
                          <span className="inline-flex items-center gap-1 line-clamp-1">
                            <MapPin className="h-3 w-3 shrink-0" /> {p.address}
                          </span>
                        )}
                        <span>•</span>
                        <span className="shrink-0">{p.total_units}세대</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ 위탁임대 — 위기 자산 회복 ============ */}
      <section id="expertise" className="bg-gradient-to-b from-white to-[#F0F4FF] text-foreground py-24 md:py-32 relative overflow-hidden scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 relative">
          <div className="max-w-2xl mb-16">
            <p className="text-overline text-primary mb-4">전문 해결 영역</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              위기 자산을 정상화하는 6가지 전문 영역
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              일반 관리회사가 손대지 않는 영역. {COMPANY.yearsOfExperience}년 현장 노하우로 직접 해결합니다.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { tag: "긴급",    title: "HUG 대위변제 대응",       desc: "보증보험 사고 이후 자산 정리·임차인 정리·후속 절차 동행" },
              { tag: "정상화",  title: "부실 건물 회복",          desc: "수익이 안 나오는 빈 건물을 단계적 수선 + 임차인 매칭으로 회복" },
              { tag: "중재",    title: "세입자 분쟁 해결",        desc: "이러지도 저러지도 못하는 임차인 갈등을 현장 중재 + 법적 절차 안내로 정리" },
              { tag: "현금흐름", title: "임차 수익 흐름화",        desc: "소유권은 있지만 운영이 막힌 자산을 안정적 임대 수익으로 전환" },
              { tag: "법무동행", title: "변호사·법무 자문",        desc: "변호사비 부담 없이 시작. 실제 자문 네트워크 함께 동원" },
              { tag: "경험",    title: `${COMPANY.yearsOfExperience}년 실전 조언`, desc: "교과서가 아닌 현장에서 쌓은 노하우. 케이스별 최적의 다음 한 수" },
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

      {/* ============ 경매 건물 전문 서비스 (핵심 차별화) ============ */}
      <section id="auction-service" className="relative py-24 md:py-32 overflow-hidden">
        {/* 배경: 좌측에 짙은 블루 그라디언트, 우측에 밝은 블루 */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F2B5B] via-[#1B4DDB] to-[#3B82F6]" />
        {/* 패턴 오버레이 */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* 좌측: 텍스트 영역 */}
            <div className="text-white">
              {/* 뱃지 */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-sm font-medium mb-8">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                경매 건물 전문 서비스
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
                경매 진행 중인 건물,<br/>
                <span className="text-amber-300">공실로 손해만</span><br/>
                보고 계십니까?
              </h2>

              <div className="mt-8 space-y-4 text-base md:text-lg text-white/80 leading-relaxed">
                <p>
                  임차권등기 · HUG 대위변제 · 명도 문제 · 장기 공실 때문에<br className="hidden md:block" />
                  건물을 사실상 <strong className="text-white">방치</strong>하고 계신 임대인분들이 많습니다.
                </p>
                <p>
                  하지만 경매가 진행 중인 건물이라고 해서<br className="hidden md:block" />
                  반드시 <strong className="text-white">수익 창출이 불가능한 것은 아닙니다.</strong>
                </p>
              </div>

              {/* 경고 박스 */}
              <div className="mt-8 p-5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                <p className="text-amber-300 font-semibold text-lg mb-2">
                  &quot;어차피 경매 넘어갈 건데...&quot;
                </p>
                <p className="text-white/75 text-sm leading-relaxed">
                  그 생각으로 공실을 방치하는 동안, 매달 관리비·공과금·청소비 등의 비용이<br/>
                  지속적으로 발생하고 있습니다. <strong className="text-white">생각보다 큰 손실</strong>이 될 수 있습니다.
                </p>
              </div>

              {/* CTA */}
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <a href="tel:01098936882" className="inline-flex items-center justify-center gap-2 bg-amber-400 text-[#0F2B5B] hover:bg-amber-300 h-14 px-8 rounded-xl text-lg font-bold transition-all hover:shadow-2xl hover:-translate-y-0.5">
                  <Phone className="h-5 w-5" />
                  010-9893-6882
                </a>
                <a href="/contact" className="inline-flex items-center justify-center gap-2 bg-white/15 text-white border border-white/30 hover:bg-white/25 h-14 px-8 rounded-xl text-lg font-semibold transition-all">
                  온라인 문의하기
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
              <p className="mt-4 text-xs text-white/50">
                ※ 건물 주소 또는 연락처를 문자로 남겨주시면 검토 후 연락드립니다.
              </p>
            </div>

            {/* 우측: 체크리스트 카드 */}
            <div className="relative">
              {/* 카드 배경 글로우 */}
              <div className="absolute -inset-4 bg-white/5 rounded-3xl blur-xl" />

              <div className="relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 md:p-10">
                <h3 className="text-white text-xl font-bold mb-6">
                  이런 건물을 전문적으로 검토합니다
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">임차권등기 세대가 많은 건물</p>
                      <p className="text-white/55 text-sm mt-0.5">등기 정리와 임차인 관리를 동시에</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">HUG 대위변제 진행 건물</p>
                      <p className="text-white/55 text-sm mt-0.5">보증사고 이후 자산 정리 전문</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">공실이 다수 발생한 건물</p>
                      <p className="text-white/55 text-sm mt-0.5">낙찰 전까지 공실 수익화</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">관리가 어려운 건물</p>
                      <p className="text-white/55 text-sm mt-0.5">명도·시설·세입자 문제 종합 대응</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">경매 진행 중인 건물</p>
                      <p className="text-white/55 text-sm mt-0.5">낙찰 전 기간 동안 수익 극대화</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/15">
                  <p className="text-white/70 text-sm leading-relaxed">
                    이미 포기하셨던 건물이라도<br/>
                    <strong className="text-white">한 번쯤은 확인해 보시기 바랍니다.</strong>
                  </p>
                  <p className="mt-3 text-amber-300 text-xs font-medium">
                    ※ 경매 진행 건물, 임차권등기 다수 건물, 공실 다수 건물 우선 상담
                  </p>
                </div>
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
              { quote: "HUG 대위변제 통보 받고 막막했는데, JNP에서 전 과정을 동행해주셔서 건물을 포기하지 않을 수 있었습니다.", initial: "K", color: "bg-primary/10 text-primary", who: "부천 중동 오피스텔 소유주", result: "공실률 40% → 12% 개선" },
              { quote: "3년째 공실이던 건물이 4개월 만에 정상화됐습니다. 매월 투명한 보고서를 받으니 마음이 놓입니다.", initial: "P", color: "bg-emerald-50 text-emerald-600", who: "서울 관악구 빌라 소유주", result: "수금률 60% → 95% 개선" },
              { quote: "세입자 분쟁 때문에 스트레스가 극심했는데, JNP가 중재부터 법적 절차 안내까지 전부 처리해주셨어요.", initial: "L", color: "bg-purple-50 text-purple-600", who: "인천 부평 다세대 소유주", result: "분쟁 해결 완료 · 2개월" },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-blue-100 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-foreground/85 leading-relaxed mb-6">&quot;{t.quote}&quot;</blockquote>
                <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${t.color}`}>{t.initial}</div>
                  <div>
                    <p className="text-sm font-semibold">{t.who}</p>
                    <p className="text-xs text-muted-foreground">{t.result}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            * 실제 고객 후기이며, 개인정보 보호를 위해 이니셜로 표기합니다.
          </p>
        </div>
      </section>

      {/* ============ Case Studies ============ */}
      <section className="bg-[#f5f7fb] py-24 md:py-32 border-y border-border/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="text-overline text-primary mb-4">해결 사례</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              실제 해결 사례
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              JNP가 처리한 위탁임대 사건. 개인정보 보호를 위해 가명·요약 처리.
            </p>
          </div>
          <CaseCarousel cases={CASE_STUDIES} />
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
            <div className="absolute top-6 left-[10%] right-[10%] h-px bg-border/60" />
            <div className="grid grid-cols-5 gap-3 relative">
              {[
                { step: "01", title: "문의 접수",  desc: "전화·카톡·온라인 폼 청취" },
                { step: "02", title: "현장 실사",  desc: "건물·세대·임차인 종합 점검" },
                { step: "03", title: "위탁 계약",  desc: "수수료·범위·기간 명문화" },
                { step: "04", title: "관리 운영",  desc: "수금·민원·공실·분쟁 일괄 대응" },
                { step: "05", title: "월 정산",    desc: "수익·지출·진행상황 보고서 발송" },
              ].map(s => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm relative z-10 mb-5">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-base mb-2">{s.title}</h3>
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
        </div>
      </section>

      {/* ============ 인증·신뢰 ============ */}
      <section className="bg-[#f5f7fb] py-20 border-y border-border/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-overline text-primary mb-4">공식 등록·인증</p>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-0.025em" }}>
              공식 등록 · 인증
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden">
            {[
              { label: "사업자등록", value: COMPANY.legal.registrationNumber, sub: "부천세무서" },
              { label: "전문 분야", value: "위탁임대", sub: COMPANY.business.category },
              { label: "운영 경력", value: `${COMPANY_STATS.yearsAsTeam}년`, sub: "1999년 시작" },
              { label: "관리 자산", value: `${COMPANY_STATS.operatedBuildings}+`, sub: `${COMPANY_STATS.managedUnits}+ 세대` },
            ].map((c) => (
              <div key={c.label} className="bg-white p-6 md:p-7 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{c.label}</p>
                <p className="text-xl md:text-2xl font-bold text-primary tracking-tight">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            * HUG 협력업체 인증 · 부동산 협회 등록증 등 추가 인증서는{" "}
            <Link href="/about" className="underline hover:text-primary">회사소개</Link> 페이지 참조
          </p>
        </div>
      </section>

      {/* ============ QR 안내 (입주민) ============ */}
      <section className="bg-background py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-3xl bg-[#0a1730] p-8 md:p-14 text-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.04]" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-overline text-white/55 mb-3">입주민 안내</p>
                <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", letterSpacing: "-0.025em" }}>
                  건물에서 본 QR을<br />스캔하셨나요?
                </h2>
                <p className="mt-5 text-white/75 leading-relaxed text-base">
                  입주민 페이지에서 민원·AS를 접수하고,
                  공지사항과 계약 서류를 한 곳에서 확인하세요.
                </p>
              </div>
              <div className="grid gap-3">
                <Button asChild size="lg" className="bg-white text-[#0a1730] hover:bg-white/90 justify-start h-auto py-5 px-6 font-semibold">
                  <Link href="/tenant/complaint" className="flex items-center gap-4">
                    <MessageCircle className="h-5 w-5" />
                    <div className="text-left flex-1">
                      <div>민원/AS 접수</div>
                      <div className="text-xs opacity-70 font-normal mt-0.5">전화 없이 간편 온라인 접수</div>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white/25 text-white hover:bg-white/5 justify-start h-auto py-5 px-6 font-semibold">
                  <Link href="/tenant" className="flex items-center gap-4">
                    <FileText className="h-5 w-5" />
                    <div className="text-left flex-1">
                      <div>공지사항·서류</div>
                      <div className="text-xs opacity-65 font-normal mt-0.5">계약서·안내문·서식 다운로드</div>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
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

      {/* ============ 부동산 파트너 CTA — 풀스크린 이미지 ============ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CTA_IMAGE}
          alt="JNP 위탁임대 상담"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#0a1730]/92" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1730] via-[#0a1730]/95 to-[#0a1730]/85" />

        <div className="relative mx-auto max-w-5xl px-6 text-center text-white">
          <p className="text-overline text-white/55 mb-4">부동산 파트너</p>
          <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
            공실 매물 정보,<br className="md:hidden" />
            부동산 회원께 실시간 공개합니다
          </h2>
          <p className="mt-6 text-base md:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            JNP 관리 건물의 실시간 공실 현황을 가입 후 바로 열람.
            <br className="hidden md:block" />
            보증금·월세·이미지·상세 정보까지 모두 제공됩니다.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-white text-[#0a1730] hover:bg-white/90 h-12 px-7 font-semibold">
              <Link href="/agency/signup">부동산 가입 신청 <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 h-12 px-7 font-semibold">
              <Link href="/agency/login">기존 회원 로그인</Link>
            </Button>
          </div>

          <div className="mt-14 grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              "실시간 공실 현황",
              "보증금·월세 즉시 확인",
              "이미지·상세 정보 제공",
            ].map((t) => (
              <div key={t} className="flex items-center justify-center gap-2 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 최종 CTA (푸터 바로 위) ============ */}
      <section className="bg-gradient-to-br from-primary via-[#2563EB] to-[#3B82F6] text-white py-24 md:py-32 relative overflow-hidden">
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
            {COMPANY.yearsOfExperience}년간 67건 이상의 위기 건물을 정상화한 JNP주택관리.<br />
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
