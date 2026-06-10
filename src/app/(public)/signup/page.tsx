import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Handshake, Users, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "회원가입",
  description: "JNP주택관리 회원가입 — 임차인·부동산·임대인 맞춤 서비스를 신청하세요.",
};

const ROLES = [
  {
    href: "/signup/tenant",
    icon: Users,
    label: "입주민(임차인)",
    title: "임차인 회원",
    desc: "민원·AS를 전화 없이 온라인으로 접수하고, 답변과 처리 현황을 확인합니다.",
    cta: "임차인 가입 신청",
  },
  {
    href: "/agency/signup",
    icon: Handshake,
    label: "공인중개사",
    title: "부동산 회원",
    desc: "JNP 관리 건물의 실시간 공실 매물을 열람하고, 임대인 소개 시 업계 최고 수준의 수수료 혜택을 받습니다.",
    cta: "부동산 가입 신청",
  },
  {
    href: "/signup/landlord",
    icon: Building2,
    label: "건물주·소유주",
    title: "임대인 회원",
    desc: "내 건물의 임차중·공실 현황, 수금·정산 내역과 월간 보고서를 확인합니다.",
    cta: "임대인 가입 신청",
  },
];

export default function SignupHubPage() {
  return (
    <section className="bg-white section-pad">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-overline text-primary mb-4">회원가입</p>
          <h1 className="heading-section text-foreground">어떤 회원으로 가입하시나요?</h1>
          <p className="mt-5 text-lead">
            역할을 선택하면 맞춤 가입 화면으로 이동합니다. 가입 신청 후 관리자 승인이 완료되면 이용할 수 있습니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.href}
                href={r.href}
                className="group rounded-2xl border border-[#E8EBF0] bg-white p-7 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/[0.06] flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-[11px] font-semibold text-primary/60 mb-1">{r.label}</p>
                <h2 className="font-bold text-lg text-foreground">{r.title}</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed flex-1">{r.desc}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {r.cta} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-[#E8EBF0] bg-[#F7F8FB] p-6 flex items-start gap-3">
          <KeyRound className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/70 leading-relaxed">
            <p className="font-semibold text-foreground mb-1">이미 입주 중인 임차인이신가요?</p>
            <p>
              JNP 관리 건물 입주민은 가입 없이도 <Link href="/tenant/login" className="text-primary font-semibold underline underline-offset-2">임차인존</Link>에서
              호실과 휴대폰 번호만으로 바로 민원 접수·내 계약 확인이 가능합니다.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          JNP주택관리 직원이신가요?{" "}
          <Link href="/signup/staff" className="text-primary font-semibold hover:underline">직원 계정 신청</Link>
        </p>
      </div>
    </section>
  );
}
