import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Check, ClipboardCheck, FileText, KeyRound, MapPin, MessageCircle, Phone, ShieldCheck, Wrench } from "lucide-react";
import { CoreServicesCarousel } from "@/components/shared/CoreServicesCarousel";
import { LocalBusinessJsonLd } from "@/components/shared/JsonLd";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "JNP주택관리 — 위탁임대·건물 운영 전문",
  description: "공실, 임대료 수금, 시설관리, 임차인 응대까지 한 곳에서 관리합니다. JNP주택관리 무료 상담.",
  alternates: { canonical: "https://jnphousing.co.kr" },
};

const PAIN_POINTS = [
  "공실이 길어져 관리비만 쌓이는 건물",
  "임대료 수금과 정산이 제때 되지 않는 현장",
  "민원·하자·퇴거 대응에 시간이 빼앗기는 상황",
  "HUG 대위변제나 경매 절차가 얽힌 건물",
];

const PROCESS = [
  { icon: MapPin, number: "01", title: "현장 확인", body: "건물 상태와 계약·공실 현황을 먼저 확인합니다." },
  { icon: ClipboardCheck, number: "02", title: "운영안 제시", body: "필요 업무, 예상 일정과 비용 범위를 설명합니다." },
  { icon: KeyRound, number: "03", title: "전담 운영", body: "수금·민원·시설·공실 업무를 한 흐름으로 관리합니다." },
  { icon: FileText, number: "04", title: "정산·보고", body: "진행 내역과 정산 자료를 확인하기 쉽게 공유합니다." },
];

export default function HomePage() {
  return (
    <main className="bg-white text-foreground">
      <LocalBusinessJsonLd />
      <section className="relative isolate overflow-hidden border-b border-[#E5EAF1] bg-white">
        <div className="mx-auto grid min-h-[680px] max-w-7xl lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative z-10 flex items-center px-6 py-16 sm:py-20 lg:px-10 lg:py-24">
            <div className="max-w-xl animate-fade-in">
              <p className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"><span className="h-2 w-2 rounded-full bg-[#3182F6]" />건물 운영을 한 곳에서</p>
              <h1 className="text-[2.45rem] font-bold leading-[1.13] tracking-[-0.045em] text-[#16233A] sm:text-5xl lg:text-[3.55rem]">건물 관리의 부담은 줄이고,<br />운영의 기준은 높입니다.</h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">공실 관리부터 임대료 수금, 시설 점검, 임차인 응대까지. JNP가 현장을 직접 살피고 운영 과정을 투명하게 공유합니다.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={COMPANY.contact.phoneHref} className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-white transition hover:bg-[#13213D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Phone className="h-4.5 w-4.5" /> {COMPANY.contact.phone}</a>
                <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-[#D7DEE9] bg-white px-6 font-semibold text-[#16233A] transition hover:border-primary/40 hover:bg-[#F7F9FC]"><MessageCircle className="h-4.5 w-4.5" /> 카카오로 상담하기</a>
              </div>
              <p className="mt-4 text-xs text-slate-500">상담은 무료이며, 상담만으로 계약 의무가 생기지 않습니다.</p>
            </div>
          </div>
          <div className="relative min-h-[390px] lg:min-h-full">
            <Image src="/images/home/hero-property-management.png" alt="관리 대상 공동주택을 점검하는 JNP 주택관리 담당자" fill priority sizes="(max-width: 1024px) 100vw, 54vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1C35]/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-white/15 lg:to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 animate-slide-up rounded-2xl border border-white/60 bg-white/90 p-5 shadow-xl backdrop-blur-md sm:left-auto sm:w-[330px] lg:bottom-10 lg:right-10">
              <p className="text-xs font-semibold text-primary">JNP FIELD STANDARD</p><p className="mt-2 font-bold text-[#16233A]">현장을 보고, 기록하고, 보고합니다.</p><p className="mt-1 text-sm leading-6 text-slate-600">말뿐인 관리가 아닌 확인 가능한 운영을 지향합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E8ECF2] bg-[#F7F9FC] py-18 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div><p className="text-sm font-semibold text-primary">관리의 시작</p><h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.035em] text-[#16233A] sm:text-4xl">건물마다 문제는 달라도,<br />운영의 빈틈에서 시작됩니다.</h2></div>
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">{PAIN_POINTS.map((item) => <div key={item} className="flex items-start gap-3 border-t border-[#DCE2EB] py-5 text-[15px] leading-6 text-slate-700"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {item}</div>)}</div>
        </div>
      </section>

      <section id="expertise" className="scroll-mt-20 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center"><p className="text-sm font-semibold text-primary">핵심 서비스</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#16233A] sm:text-4xl">필요한 업무를 따로 맡기지 마세요</h2><p className="mt-4 leading-7 text-slate-600">임대 운영, 시설 관리, 임차인 응대를 하나의 전담 흐름으로 연결합니다.</p></div>
          <CoreServicesCarousel />
        </div>
      </section>

      <section className="border-y border-[#E8ECF2] bg-[#F7F9FC] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl"><p className="text-sm font-semibold text-primary">운영 절차</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#16233A] sm:text-4xl">상담부터 월간 보고까지,<br />과정을 분명하게 만듭니다.</h2></div>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-[#DDE3EC] bg-[#DDE3EC] sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map(({ icon: Icon, number, title, body }) => <li key={number} className="bg-white p-6 sm:p-7"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary" /><span className="text-xs font-bold tracking-[0.15em] text-slate-400">{number}</span></div><h3 className="mt-8 text-lg font-bold text-[#16233A]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100"><Image src="/images/home/consultation-property.png" alt="건물주와 관리 방안을 검토하는 JNP 상담 담당자" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>
          <div><p className="text-sm font-semibold text-primary">신뢰할 수 있는 운영</p><h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.035em] text-[#16233A] sm:text-4xl">현장을 모르면<br />좋은 관리도 없습니다.</h2><p className="mt-5 leading-7 text-slate-600">JNP는 건물의 서류만 보지 않습니다. 현장의 시설 상태, 공실 원인, 임차인과의 소통 문제를 함께 확인하고 건물에 맞는 관리 범위를 제안합니다.</p>
            <div className="mt-7 space-y-4">{["현장 상태를 기준으로 한 관리 범위", "진행 내역과 정산 자료의 체계적 공유", "담당 창구를 통한 일관된 소통"].map((item) => <p key={item} className="flex items-center gap-3 font-medium text-[#26364F]"><ShieldCheck className="h-5 w-5 text-primary" /> {item}</p>)}</div>
            <Link href="/about" className="mt-8 inline-flex items-center gap-2 font-semibold text-primary transition-all hover:gap-3">회사와 운영 원칙 보기 <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E8ECF2] bg-[#F7F9FC] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6"><h2 className="text-3xl font-bold tracking-[-0.035em] text-[#16233A]">찾으시는 업무로 바로 이동하세요</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">{[
            { icon: Building2, title: "임대인·건물주", body: "위탁임대와 건물관리 상담", href: "/contact" },
            { icon: Wrench, title: "입주민", body: "민원과 시설 AS 접수", href: "/tenant/complaint" },
            { icon: KeyRound, title: "경매 건물", body: "공실·운영 가능성 검토", href: "/auction" },
          ].map(({ icon: Icon, title, body, href }) => <Link key={title} href={href} className="group rounded-2xl border border-[#DDE3EC] bg-white p-6 transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg hover:shadow-slate-900/5"><Icon className="h-6 w-6 text-primary" /><h3 className="mt-7 text-lg font-bold text-[#16233A]">{title}</h3><p className="mt-2 text-sm text-slate-600">{body}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">바로가기 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>)}</div>
        </div>
      </section>

      <section className="bg-[#14233F] py-20 text-white sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold text-blue-300">무료 관리 상담</p><h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">건물 주소와 현재 상황을 알려주세요.<br />검토할 수 있는 범위부터 답해드립니다.</h2><p className="mt-4 text-white/65">과장된 수익 약속보다, 지금 가능한 운영 방법을 먼저 설명합니다.</p></div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><a href={COMPANY.contact.phoneHref} className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-white px-6 font-bold text-[#14233F] hover:bg-blue-50"><Phone className="h-4.5 w-4.5" /> 전화 상담</a><Link href="/contact" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/25 px-6 font-bold text-white hover:bg-white/10">문의 남기기 <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>
    </main>
  );
}
