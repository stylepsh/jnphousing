import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ClipboardCheck,
  FileCheck2,
  FileText,
  KeyRound,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { CoreServicesCarousel } from "@/components/shared/CoreServicesCarousel";
import { LocalBusinessJsonLd } from "@/components/shared/JsonLd";
import { COMPANY } from "@/lib/company";
import { PUBLIC_REVIEWS } from "@/lib/data/reviews";
import { OperationsHeroVisual } from "@/components/shared/OperationsHeroVisual";
import { ConversationShowcase } from "@/components/shared/ConversationShowcase";

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

const TRUST_PROOFS = [
  {
    icon: Building2,
    title: "관리현장 공개",
    body: "개인정보를 제외한 가상 포트폴리오로 운영 유형과 규모를 확인할 수 있습니다.",
    href: "/properties",
    linkLabel: "관리현장 보기",
  },
  {
    icon: FileCheck2,
    title: "범위·비용 사전 안내",
    body: "계약 전에 필요한 업무, 일정과 비용 범위를 먼저 설명합니다.",
    href: "/services",
    linkLabel: "서비스 범위 보기",
  },
  {
    icon: ReceiptText,
    title: "진행·정산 기록",
    body: "운영 중 처리 내역과 정산 자료를 확인하기 쉽게 공유합니다.",
    href: "/about",
    linkLabel: "운영 원칙 보기",
  },
  {
    icon: BadgeCheck,
    title: "운영 흐름 공개",
    body: "과장된 성공담 대신 어떤 문제를 어떻게 처리하는지 보여드립니다.",
    href: "/reviews",
    linkLabel: "운영사례·후기 보기",
  },
];

export default function HomePage() {
  return (
    <main id="main-content" className="bg-white text-foreground">
      <LocalBusinessJsonLd />
      <section className="relative isolate overflow-hidden border-b border-[#E5EAF1] bg-white">
        <div className="mx-auto grid min-h-[680px] max-w-7xl lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative z-10 flex items-center px-6 py-16 sm:py-20 lg:px-10 lg:py-24">
            <div className="max-w-xl animate-fade-in">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-500" />혼자 감당하던 건물 운영을 한 팀으로</p>
              <h1 className="text-[2.55rem] font-bold leading-[1.1] tracking-[-0.05em] text-[#16233A] sm:text-5xl lg:text-[3.65rem]">공실·미수금·민원,<br /><span className="text-blue-600">혼자 버티지 마세요.</span></h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">연락은 계속 오고 정산은 밀리고 어디부터 손대야 할지 막막할 때, JNP가 현장을 확인하고 담당을 나누고 결과까지 보고합니다.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"><ClipboardCheck className="h-4.5 w-4.5" /> 내 건물 무료 진단</Link>
                <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-[#D7DEE9] bg-white px-6 font-bold text-[#16233A] transition hover:border-blue-300 hover:bg-blue-50"><MessageCircle className="h-4.5 w-4.5" /> 카카오로 바로 묻기</a>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 상황 설명 10분</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 상담 무료</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 계약 의무 없음</span></div>
            </div>
          </div>
          <OperationsHeroVisual />
        </div>
      </section>

      <section aria-label="상담과 운영 안내" className="border-b border-[#E5EAF1] bg-white">
        <div className="mx-auto grid max-w-6xl divide-y divide-[#E5EAF1] px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            "무료 상담 · 상담 후 계약 의무 없음",
            "업무 범위와 비용을 계약 전에 안내",
            "진행 내역과 정산 자료를 체계적으로 공유",
          ].map((item) => (
            <p key={item} className="flex min-h-14 items-center gap-2.5 py-3 text-sm font-medium text-[#35445C] sm:px-5 first:sm:pl-0 last:sm:pr-0">
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </p>
          ))}
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
            {PROCESS.map(({ icon: Icon, number, title, body }) => <li key={number} className="bg-white p-6 sm:p-7"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary" /><span className="text-xs font-bold tracking-[0.15em] text-slate-600">{number}</span></div><h3 className="mt-8 text-lg font-bold text-[#16233A]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></li>)}
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

      <section className="border-y border-[#E8ECF2] bg-[#F7F9FC] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-semibold text-primary">운영 근거</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.035em] text-[#16233A] sm:text-4xl">
                맡기기 전에<br />확인할 수 있어야 합니다.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-slate-600">
                큰 숫자나 막연한 약속보다, 실제 운영에서 무엇을 보고받는지 먼저 확인하세요.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-[#DDE3EC] bg-[#DDE3EC] sm:grid-cols-2">
              {TRUST_PROOFS.map(({ icon: Icon, title, body, href, linkLabel }) => (
                <article key={title} className="flex min-h-[245px] flex-col bg-white p-6 sm:p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF3FA] text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-7 text-lg font-bold text-[#16233A]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                  <Link href={href} className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold text-primary">
                    {linkLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="scroll-mt-20 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">{PUBLIC_REVIEWS.length > 0 ? "운영사례 · 고객 후기" : "상담·운영 대화 예시"}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#16233A] sm:text-4xl">
                {PUBLIC_REVIEWS.length > 0 ? <>꾸며낸 칭찬보다<br className="sm:hidden" /> 확인된 경험을 보여드립니다.</> : <>상황을 보내면,<br className="sm:hidden" /> 다음 행동으로 답합니다.</>}
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                {PUBLIC_REVIEWS.length > 0
                  ? "고객 후기는 원문과 게재 동의를 확인한 내용만 공개합니다."
                  : "건물주와 입주민이 자주 묻는 상황을 대화 형식으로 재구성했습니다. 실제 고객 대화가 아닌 업무 흐름 예시입니다."}
              </p>
            </div>
            <Link href="/reviews" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-primary sm:self-auto">
              {PUBLIC_REVIEWS.length > 0 ? "고객 후기 보기" : "후기 공개 기준 보기"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {PUBLIC_REVIEWS.length > 0 ? (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {PUBLIC_REVIEWS.slice(0, 3).map((review) => (
                <article key={review.id} className="rounded-2xl border border-[#DDE3EC] bg-white p-6 shadow-sm">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" /> 원문·동의 확인
                  </span>
                  <h3 className="mt-5 text-lg font-bold leading-snug text-[#16233A]">{review.title}</h3>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">{review.body}</p>
                  <p className="mt-5 border-t border-[#E8ECF2] pt-4 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{review.authorAlias}</span> · {review.authorRoleLabel}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <ConversationShowcase />
          )}
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
