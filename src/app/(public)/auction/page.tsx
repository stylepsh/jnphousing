import type { Metadata } from "next";
import { Phone, ArrowRight, CheckCircle, ShieldCheck, AlertTriangle } from "lucide-react";
import { CostCalculator } from "./cost-calculator";
import { LeadForm } from "./lead-form";

const TEL = "010-9893-6882";
const TEL_HREF = "tel:01098936882";

export const metadata: Metadata = {
  title: "경매 건물 공실 관리 — 낙찰 전 수익 창출 | JNP주택관리",
  description:
    "경매 진행 중인 건물, 공실로 방치하고 계십니까? 임차권등기·HUG 대위변제·장기 공실 건물 전문. 낙찰 전까지 수익을 만들어드립니다. 무료 상담 010-9893-6882",
  keywords: [
    "경매 건물 관리", "경매 공실 수익", "임차권등기 관리", "HUG 대위변제", "경매 건물 임대", "JNP주택관리",
  ],
  openGraph: {
    title: "경매 건물 공실 관리 — 낙찰 전 수익 창출 | JNP주택관리",
    description: "경매 진행 중인 건물도 낙찰 전까지 수익 창출이 가능합니다. 임차권등기·HUG 대위변제·장기 공실 전문. 무료 상담 010-9893-6882",
    type: "website",
  },
};

const CHECKLIST = [
  { title: "임차권등기 세대가 많은 건물", desc: "복잡한 등기 정리와 임차인 관리를 동시에 진행해 드립니다." },
  { title: "HUG 대위변제 진행 건물", desc: "보증사고 이후의 자산 정리·재임대를 전문적으로 대응합니다." },
  { title: "공실이 다수 발생한 건물", desc: "단기 임대 등으로 낙찰 전까지 공실을 수익으로 전환합니다." },
  { title: "관리가 어려운 건물", desc: "명도·시설·세입자 문제를 종합적으로 대응합니다." },
  { title: "경매 진행 중인 건물", desc: "낙찰 전 남은 기간 동안 수익을 극대화하는 운영을 제안합니다." },
];

export default function AuctionLandingPage() {
  return (
    <div className="bg-white">
      {/* ============ 1. 히어로 ============ */}
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-5xl px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-sm font-medium mb-8">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            경매 건물 전문 서비스
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12]">
            경매 진행 중인 건물 소유주분께
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-amber-300 font-semibold">
            공실로 손해만 보고 계십니까?
          </p>
          <p className="mt-4 text-base md:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            임차권등기 · HUG 대위변제 · 명도 · 장기 공실 — 사실상 방치된 건물도
            낙찰 전까지 수익을 만들 수 있습니다.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href={TEL_HREF} className="inline-flex items-center justify-center gap-2 bg-amber-400 text-[#0F2B5B] hover:bg-amber-300 h-16 px-10 rounded-xl text-xl font-black transition-all hover:shadow-2xl hover:-translate-y-0.5">
              <Phone className="h-6 w-6" />
              {TEL}
            </a>
            <a href="#consult" className="inline-flex items-center justify-center gap-2 bg-white/15 text-white border border-white/30 hover:bg-white/25 h-16 px-8 rounded-xl text-lg font-semibold transition-all">
              무료 상담 신청
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          <p className="mt-4 text-xs text-white/50">전화 통화가 부담되시면 아래에서 건물 주소·연락처만 남겨주세요.</p>
        </div>
      </section>

      {/* ============ 2. 문제 인식 + 계산기 ============ */}
      <section className="bg-[#f5f7fb] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-600 font-semibold text-sm mb-4">
              <AlertTriangle className="h-4 w-4" /> 방치의 함정
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              &quot;어차피 경매 넘어갈 건데...&quot;
            </h2>
            <div className="mt-6 space-y-4 text-base md:text-lg text-slate-600 leading-relaxed">
              <p>
                이 생각으로 공실을 방치하는 동안에도 <strong className="text-slate-900">관리비·공과금·청소비</strong>는
                매달 빠져나갑니다.
              </p>
              <p>
                낙찰까지 수개월에서 1년 이상 걸리는 경우, 그 비용은
                <strong className="text-amber-600"> 생각보다 훨씬 큰 손실</strong>로 쌓입니다.
              </p>
              <p>
                같은 기간을 <strong className="text-slate-900">수익을 만드는 시간</strong>으로 바꿀 수 있다면 어떨까요?
              </p>
            </div>
          </div>
          <CostCalculator />
        </div>
      </section>

      {/* ============ 3. 우리가 할 수 있는 것 (체크리스트, hover 확장) ============ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 text-amber-600 font-semibold text-sm mb-3">
              <ShieldCheck className="h-4 w-4" /> 전문 검토 영역
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">
              이런 건물을 전문적으로 검토합니다
            </h2>
            <p className="mt-3 text-slate-500">다른 관리회사는 손대지 않는 영역입니다.</p>
          </div>

          <div className="space-y-3">
            {CHECKLIST.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50/40 px-5 py-4 transition-all cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-base md:text-lg font-bold text-slate-900 flex-1">{item.title}</p>
                  <ArrowRight className="h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="max-h-0 group-hover:max-h-24 overflow-hidden transition-all duration-300">
                  <p className="text-sm text-slate-600 pl-12 pt-2">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 4. 설득 ============ */}
      <section className="bg-[#0F2B5B] text-white py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-2xl md:text-4xl lg:text-5xl font-bold leading-[1.3] tracking-tight">
            이미 포기하셨던 건물이라도
            <br />
            <span className="text-amber-300">한 번쯤은 확인해 보시기 바랍니다.</span>
          </p>
          <p className="mt-8 text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
            지금 운영이 어렵다고 생각되는 건물도,
            의외의 방법으로 다시 활용 가능한 경우가 적지 않습니다.
          </p>
        </div>
      </section>

      {/* ============ 5. 최종 CTA + 인라인 폼 ============ */}
      <section id="consult" className="relative bg-primary text-white py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="heading-section leading-tight">
              건물 주소만 남겨주세요.
              <br />
              <span className="text-amber-300">검토 후 연락드리겠습니다.</span>
            </h2>
            <p className="mt-5 text-white/75 text-lg leading-relaxed">
              건물 주소 또는 연락처를 남겨주시면, 담당자가 직접 검토 후 연락드립니다.
            </p>

            <a href={TEL_HREF} className="mt-8 inline-flex items-center gap-3 bg-amber-400 text-[#0F2B5B] hover:bg-amber-300 h-16 px-8 rounded-2xl text-2xl font-black transition-all hover:shadow-2xl hover:-translate-y-0.5">
              <Phone className="h-7 w-7" />
              {TEL}
            </a>
            <p className="mt-5 text-amber-300 text-sm font-medium">
              ※ 경매 진행 건물 · 임차권등기 다수 건물 · 공실 다수 건물 우선 상담
            </p>
          </div>

          <LeadForm />
        </div>
      </section>
    </div>
  );
}
