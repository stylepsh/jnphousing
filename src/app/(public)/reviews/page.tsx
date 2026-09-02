import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, Clock3, FileCheck2, MessageCircle, ShieldCheck } from "lucide-react";
import { PageHero, COMPANY_TABS } from "@/components/layout/PageHero";
import { PUBLIC_REVIEWS } from "@/lib/data/reviews";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "고객 후기·운영사례",
  description: "확인된 고객 후기와 JNP주택관리의 대표 운영 개선 흐름을 공개합니다.",
  alternates: { canonical: "/reviews" },
};

const SCENARIOS = [
  { label: "공실 누적", title: "문의는 오는데 계약이 안 되는 현장", before: "사진·가격·응대가 제각각", after: "상품화 → 다채널 광고 → 현장 안내 → 계약 일정 통합", icon: Building2 },
  { label: "운영 과부하", title: "수금·민원·수선을 혼자 처리하는 건물", before: "카톡·전화·엑셀에 기록 분산", after: "단일 접수 → 담당 배정 → 비용 승인 → 월간 보고", icon: Clock3 },
  { label: "분쟁 발생", title: "퇴거·보증금·시설 책임이 얽힌 상황", before: "당사자마다 다른 주장과 자료", after: "사실관계 정리 → 증빙 확보 → 전문가 연결 → 진행 공유", icon: ShieldCheck },
];

export default function ReviewsPage() {
  return (
    <main id="main-content" className="bg-white">
      <PageHero eyebrow="Proof Before Promise" title="좋은 말보다, 어떻게 처리하는지 보여드립니다." description="확인된 후기는 원문과 동의를 거쳐 공개하고, 공개 전에는 실제 업무 흐름을 이해할 수 있는 비식별 운영 시나리오를 제공합니다." tabs={COMPANY_TABS} activeHref="/reviews" />

      <section className="border-b border-[#E5EAF1] bg-[#F5F7FA] py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div><p className="text-sm font-bold text-blue-600">OPERATING SCENARIOS</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#16233A]">맡긴 뒤 달라져야 하는 것</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">아래 내용은 특정 고객의 성과를 가장한 후기가 아니라, JNP의 대표적인 업무 처리 구조를 설명하는 예시입니다.</p></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700"><ShieldCheck className="h-4 w-4" /> 과장 후기 없이 공개</span>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {SCENARIOS.map(({ label, title, before, after, icon: Icon }, index) => (
              <article key={label} className="animate-fade-in overflow-hidden rounded-3xl border border-[#DDE3EC] bg-white shadow-sm" style={{ animationDelay: `${index * 90}ms` }}>
                <div className="border-b border-[#E8ECF2] bg-[#14233F] p-6 text-white"><div className="flex items-center justify-between"><span className="text-xs font-bold text-blue-300">{label}</span><Icon className="h-5 w-5 text-blue-200" /></div><h3 className="mt-7 text-xl font-bold leading-snug">{title}</h3></div>
                <div className="p-6">
                  <div className="rounded-xl bg-rose-50 p-4"><p className="text-[11px] font-bold text-rose-600">BEFORE</p><p className="mt-2 text-sm leading-6 text-slate-700">{before}</p></div>
                  <div className="my-3 flex justify-center"><ArrowRight className="h-5 w-5 rotate-90 text-blue-500" /></div>
                  <div className="rounded-xl bg-emerald-50 p-4"><p className="text-[11px] font-bold text-emerald-700">JNP FLOW</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{after}</p></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-start">
            <div>
              <p className="text-sm font-bold text-blue-600">VERIFIED CUSTOMER VOICE</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#16233A]">확인된 고객 후기만 게시합니다.</h2>
              {PUBLIC_REVIEWS.length > 0 ? (
                <div className="mt-8 grid gap-4">{PUBLIC_REVIEWS.map((review) => <article key={review.id} className="rounded-2xl border border-[#DDE3EC] p-6"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><BadgeCheck className="h-4 w-4" /> 원문·동의 확인</span><h3 className="mt-4 text-xl font-bold text-[#16233A]">{review.title}</h3><p className="mt-3 leading-7 text-slate-600">{review.body}</p><p className="mt-5 border-t border-[#E8ECF2] pt-4 text-xs text-slate-500">{review.authorAlias} · {review.authorRoleLabel}</p></article>)}</div>
              ) : (
                <div className="mt-8 rounded-3xl border border-[#DDE3EC] bg-[#F8FAFC] p-7 sm:p-9">
                  <MessageCircle className="h-9 w-9 text-blue-600" />
                  <h3 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#16233A]">공개 승인된 후기를 준비하고 있습니다.</h3>
                  <p className="mt-4 max-w-xl leading-7 text-slate-600">기존 예시 문구는 실제 고객 후기처럼 보이지 않도록 모두 내렸습니다. 카카오톡·문자·서면 원문과 작성자의 공개 동의를 확인한 자료부터 올리겠습니다.</p>
                  <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-[#FEE500] px-5 font-bold text-[#3C1E1E]">후기 전달하기 <ArrowRight className="h-4 w-4" /></a>
                </div>
              )}
            </div>

            <aside className="rounded-3xl bg-[#14233F] p-7 text-white sm:p-9">
              <FileCheck2 className="h-8 w-8 text-blue-300" />
              <h2 className="mt-6 text-2xl font-bold">후기 공개 3단계</h2>
              <ol className="mt-7 space-y-6">
                {["카카오톡·문자·서면 원문 확인", "작성자에게 공개 범위와 동의 확인", "이름·연락처·상세 주소 비식별 처리"].map((item, index) => <li key={item} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-blue-200">{index + 1}</span><p className="pt-1 text-sm leading-6 text-slate-200">{item}</p></li>)}
              </ol>
              <div className="mt-8 border-t border-white/15 pt-6"><p className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> 확인되지 않은 후기는 게시하지 않습니다.</p></div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F7FA] py-14">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-6 sm:flex-row sm:items-center"><div><p className="font-bold text-[#16233A]">후기보다 먼저 운영 구조를 확인하세요.</p><p className="mt-2 text-sm text-slate-600">현장 규모와 서비스 처리 범위를 투명하게 보여드립니다.</p></div><div className="flex flex-wrap gap-3"><Link href="/properties" className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#CCD5E2] bg-white px-5 font-bold text-[#16233A]">관리현장 보기</Link><Link href="/contact" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#16233A] px-5 font-bold text-white">무료 상담 <ArrowRight className="h-4 w-4" /></Link></div></div>
      </section>
    </main>
  );
}
