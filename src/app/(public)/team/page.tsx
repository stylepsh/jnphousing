import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ClipboardList, Gavel, Headphones, KeyRound, MessageCircle, ShieldCheck, Wrench } from "lucide-react";
import { PageHero, COMPANY_TABS } from "@/components/layout/PageHero";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "구성원 — 한 창구로 움직이는 운영팀",
  description: "JNP주택관리의 운영총괄과 임대·시설·분쟁 협력 체계를 소개합니다.",
  alternates: { canonical: "/team" },
};

const OPERATING_LINES = [
  { icon: ClipboardList, label: "운영 총괄", title: "일정·수금·정산 관제", body: "현장별 할 일과 마감, 임대료 수금과 지출 승인을 한 운영표에서 관리합니다.", tasks: ["월간 운영표", "수금·지출 확인", "임대인 보고"] },
  { icon: KeyRound, label: "임대 운영", title: "공실부터 재계약까지", body: "광고·문의·현장 안내·계약·입주·갱신 일정을 끊기지 않게 연결합니다.", tasks: ["공실 상품화", "임차인 매칭", "계약 일정"] },
  { icon: Wrench, label: "시설 현장", title: "접수에서 완료 사진까지", body: "민원과 하자를 분류하고 협력업체 배정, 견적 승인, 완료 확인까지 기록합니다.", tasks: ["현장 점검", "긴급 출동", "완료 증빙"] },
  { icon: Gavel, label: "분쟁 협력", title: "혼자 대응하지 않도록", body: "HUG·퇴거·보증금·분쟁 상황은 필요한 자료를 정리해 법무·중개 협력 라인과 연결합니다.", tasks: ["자료 정리", "전문가 연결", "진행 동행"] },
];

export default function TeamPage() {
  return (
    <main id="main-content" className="bg-white">
      <PageHero eyebrow="One Desk, Four Operations" title="한 번 연락하면, 필요한 팀이 함께 움직입니다." description="담당자를 찾아다니지 않도록 상담 창구는 하나로 두고 임대·시설·수금·분쟁 실무를 현장에 맞게 연결합니다." tabs={COMPANY_TABS} activeHref="/team" />

      <section className="border-b border-[#E5EAF1] bg-white py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-18">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-bold text-blue-600">JNP OPERATING MODEL</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.04em] text-[#16233A] sm:text-4xl">사람 수를 보여주기보다,<br />누가 무엇을 끝내는지 보여드립니다.</h2>
              <p className="mt-5 leading-7 text-slate-600">정규 담당과 검증된 협력 네트워크가 하나의 운영 규칙으로 움직입니다. 고객은 JNP 한 곳에만 말씀하시면 됩니다.</p>
              <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3"><Headphones className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-blue-600">대표 상담번호</p><a href={COMPANY.contact.phoneHref} className="font-bold text-[#16233A]">{COMPANY.contact.phone}</a></div></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {OPERATING_LINES.map(({ icon: Icon, label, title, body, tasks }, index) => (
                <article key={label} className="group animate-fade-in rounded-3xl border border-[#DDE3EC] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-900/8" style={{ animationDelay: `${index * 80}ms` }}>
                  <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FC] text-blue-600"><Icon className="h-6 w-6" /></span><span className="text-xs font-bold tracking-[0.12em] text-slate-400">0{index + 1}</span></div>
                  <p className="mt-7 text-xs font-bold text-blue-600">{label}</p>
                  <h3 className="mt-2 text-xl font-bold tracking-[-0.025em] text-[#16233A]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                  <div className="mt-6 flex flex-wrap gap-1.5">{tasks.map((task) => <span key={task} className="rounded-full bg-[#F3F5F8] px-2.5 py-1 text-[11px] font-semibold text-slate-600">{task}</span>)}</div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F7FA] py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-3xl border border-[#DDE3EC] bg-white shadow-xl shadow-slate-900/5">
            <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
              <div className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#14233F] p-8 text-white sm:p-10">
                <div className="jnp-grid absolute inset-0 opacity-20" aria-hidden="true" />
                <div className="relative"><p className="text-xs font-bold tracking-[0.18em] text-blue-300">FIELD LEAD</p><div className="mt-8 flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 text-3xl font-bold">{COMPANY.representative.slice(0, 1)}</div></div>
                <div className="relative"><p className="text-2xl font-bold">{COMPANY.representative} 대표</p><p className="mt-2 text-sm leading-6 text-slate-300">건설 현장 경험을 바탕으로 시설 원인과 운영 우선순위를 직접 판단합니다.</p></div>
              </div>
              <div className="p-8 sm:p-10 lg:p-12">
                <p className="text-sm font-bold text-blue-600">대표가 책임지는 기준</p>
                <blockquote className="mt-4 text-2xl font-bold leading-snug tracking-[-0.035em] text-[#16233A] sm:text-3xl">“연락을 받는 사람이 아니라,<br />끝난 것을 확인하는 사람이 되겠습니다.”</blockquote>
                <p className="mt-6 max-w-2xl leading-7 text-slate-600">문제를 접수만 하고 넘기지 않습니다. 무엇이 원인인지, 누구에게 맡겼는지, 비용은 왜 발생했는지, 언제 끝났는지를 기록해 임대인에게 보고하는 것이 JNP의 기본입니다.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {["건설 현장 기반 판단", "HUG·분쟁 대응 경험", "월간 운영 결과 보고"].map((item) => <p key={item} className="flex items-start gap-2 rounded-xl bg-[#F5F7FA] p-3 text-sm font-semibold text-[#26364F]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}</p>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold text-blue-600">ONE CONTACT</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#16233A]">연락은 한 번, 처리는 끝까지</h2><p className="mt-4 leading-7 text-slate-600">접수 후 담당 라인이 나뉘어도 고객에게는 하나의 결과로 보고합니다.</p></div>
          <ol className="relative mt-10 grid gap-4 md:grid-cols-4">
            {[{ icon: MessageCircle, title: "상황 접수", body: "주소와 현재 문제 확인" }, { icon: Building2, title: "현장 분류", body: "임대·시설·분쟁 우선순위" }, { icon: ShieldCheck, title: "담당 실행", body: "내부 담당과 협력사 배정" }, { icon: CheckCircle2, title: "결과 보고", body: "완료·비용·다음 일정 공유" }].map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="relative rounded-2xl border border-[#DDE3EC] bg-white p-5"><span className="text-xs font-bold text-blue-500">STEP {index + 1}</span><Icon className="mt-7 h-6 w-6 text-[#16233A]" /><h3 className="mt-4 text-lg font-bold text-[#16233A]">{title}</h3><p className="mt-2 text-sm text-slate-500">{body}</p>{index < 3 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 rounded-full bg-white text-blue-500 md:block" />}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#14233F] py-16 text-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-7 px-6 lg:flex-row lg:items-center"><div><p className="text-sm font-bold text-blue-300">지금 가장 급한 문제부터</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">어디부터 손대야 할지, JNP가 먼저 정리하겠습니다.</h2></div><Link href="/contact" className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 font-bold text-[#14233F] hover:bg-blue-50">무료 관리 진단 <ArrowRight className="h-5 w-5" /></Link></div>
      </section>
    </main>
  );
}
