import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ArrowRight, CheckCircle2, MessageCircle, FileText, MapPin,
  ShieldCheck, TrendingUp, Megaphone, Pin, Calendar, Phone,
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
        {/* 어두운 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1730]/95 via-[#0a1730]/80 to-[#0a1730]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1730]/90 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl w-full px-6 py-24 md:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/20 backdrop-blur-sm text-xs font-medium tracking-wide mb-8 animate-fade-in">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              <CountUp end={COMPANY_STATS.yearsAsTeam} className="tabular-nums" />년차 위탁임대 전문기업 · 부천 중동
            </div>

            <h1
              className="font-bold tracking-tighter leading-[1.05] animate-fade-in"
              style={{
                fontSize: "clamp(36px, 7vw, 72px)",
                letterSpacing: "-0.035em",
                fontFeatureSettings: '"ss01"',
              }}
            >
              주거의 가치를<br />
              <span className="text-white/95">끝까지 책임집니다</span>
            </h1>

            <p className="mt-7 text-base md:text-lg text-white/75 leading-relaxed max-w-2xl animate-fade-in" style={{ animationDelay: "120ms" }}>
              부천·경기·서울·인천 전 지역.
              <br className="hidden md:block" />
              HUG 대위변제 · 부실 건물 정상화 · 세입자 분쟁까지
              <br className="hidden md:block" />
              {COMPANY.yearsOfExperience}년 노하우로 끝까지 해결하는 {COMPANY.brand}
            </p>

            <div className="mt-12 flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: "240ms" }}>
              <Button asChild size="lg" className="bg-white text-[#0a1730] hover:bg-white/90 h-12 px-7 font-semibold">
                <Link href="/contact">
                  무료 상담 신청 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 h-12 px-7 font-semibold">
                <Link href="/properties">관리현장 보기</Link>
              </Button>
            </div>
          </div>

          {/* 하단 부유 stat — 더 큰 임팩트 */}
          <div className="hidden md:grid grid-cols-4 gap-px mt-24 md:mt-32 max-w-4xl border-l border-white/15 animate-fade-in" style={{ animationDelay: "360ms" }}>
            {[
              { value: `${COMPANY_STATS.operatedBuildings}+`, label: "운영 건물" },
              { value: `${COMPANY_STATS.managedUnits}+`,      label: "관리 세대" },
              { value: `${COMPANY_STATS.resolvedDisputes}+`,  label: "해결 분쟁" },
              { value: `${COMPANY_STATS.yearsAsTeam}년`,      label: "운영 경력" },
            ].map((s, i) => (
              <div key={i} className="pl-6 border-r border-white/15">
                <p className="text-[10px] uppercase tracking-widest text-white/55 mb-1">{s.label}</p>
                <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">{s.value}</p>
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
              <p className="text-overline text-primary mb-4">Our Promise</p>
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

      {/* ============ 6종 시설관리 카테고리 — 실제 이미지 ============ */}
      <section className="bg-[#f5f7fb] py-24 md:py-32 border-y border-border/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-overline text-primary mb-4">Management Services</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              건물 운영의 모든 영역
            </h2>
            <p className="mt-5 text-foreground/65 text-base md:text-lg leading-relaxed">
              6종 시설관리 카테고리. 외부 업체 위탁 없이 JNP가 직접 책임집니다.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {Object.entries(CATEGORY_IMAGES).map(([key, c], idx) => (
              <div key={key} className="group relative aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 cursor-pointer animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-end text-white">
                  <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1.5">0{idx + 1}</p>
                  <h3 className="font-bold text-lg md:text-xl tracking-tight">{c.label}</h3>
                  <p className="text-xs md:text-sm text-white/75 mt-1.5 leading-relaxed line-clamp-2">
                    {c.description}
                  </p>
                </div>
              </div>
            ))}
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
              <p className="text-overline text-primary mb-4">Our Portfolio</p>
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
      <section className="bg-[#0a1730] text-white py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-6 relative">
          <div className="max-w-2xl mb-16">
            <p className="text-overline text-white/55 mb-4">Specialized Expertise</p>
            <h2 className="font-bold tracking-tight leading-[1.15]" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
              위기 자산을 정상화하는 6가지 전문 영역
            </h2>
            <p className="mt-5 text-white/65 text-base md:text-lg leading-relaxed">
              일반 관리회사가 손대지 않는 영역. {COMPANY.yearsOfExperience}년 현장 노하우로 직접 해결합니다.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden">
            {[
              { tag: "긴급",    title: "HUG 대위변제 대응",       desc: "보증보험 사고 이후 자산 정리·임차인 정리·후속 절차 동행" },
              { tag: "정상화",  title: "부실 건물 회복",          desc: "수익이 안 나오는 빈 건물을 단계적 수선 + 임차인 매칭으로 회복" },
              { tag: "중재",    title: "세입자 분쟁 해결",        desc: "이러지도 저러지도 못하는 임차인 갈등을 현장 중재 + 법적 절차 안내로 정리" },
              { tag: "현금흐름", title: "임차 수익 흐름화",        desc: "소유권은 있지만 운영이 막힌 자산을 안정적 임대 수익으로 전환" },
              { tag: "법무동행", title: "변호사·법무 자문",        desc: "변호사비 부담 없이 시작. 실제 자문 네트워크 함께 동원" },
              { tag: "경험",    title: `${COMPANY.yearsOfExperience}년 실전 조언`, desc: "교과서가 아닌 현장에서 쌓은 노하우. 케이스별 최적의 다음 한 수" },
            ].map((s, i) => (
              <div key={i} className="bg-[#0a1730] p-7 md:p-8 hover:bg-white/[0.03] transition-colors">
                <p className="text-[10px] uppercase tracking-widest text-white/45 mb-3">0{i + 1} · {s.tag}</p>
                <h3 className="font-bold text-lg md:text-xl tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm text-white/65 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-8 rounded-2xl bg-white/[0.04] border border-white/10">
            <div>
              <p className="text-lg font-semibold">자산 운영이 막혀 있다면, 망설이지 마세요.</p>
              <p className="text-sm text-white/65 mt-1.5 inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {COMPANY.serviceArea} 전 지역 출동 가능
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-[#0a1730] hover:bg-white/90 font-semibold whitespace-nowrap">
              <a href={COMPANY.contact.phoneHref}>
                <Phone className="h-4 w-4 mr-2" /> {COMPANY.contact.phone}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ============ Before/After ============ */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-overline text-primary mb-4">Transformation</p>
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

      {/* ============ Case Studies ============ */}
      <section className="bg-[#f5f7fb] py-24 md:py-32 border-y border-border/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="text-overline text-primary mb-4">Case Studies</p>
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
            <p className="text-overline text-primary mb-4">Our Process</p>
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
            <p className="text-overline text-primary mb-4">Trust & Compliance</p>
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
                <p className="text-overline text-white/55 mb-3">For Tenants</p>
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
                <p className="text-overline text-primary mb-3">Latest News</p>
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
          <p className="text-overline text-white/55 mb-4">Real Estate Partners</p>
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
    </>
  );
}
