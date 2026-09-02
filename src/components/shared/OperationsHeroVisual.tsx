import Image from "next/image";
import { AlertTriangle, CheckCircle2, CircleDollarSign, KeyRound, Wrench } from "lucide-react";

const SIGNALS = [
  { icon: KeyRound, label: "공실", before: "12", after: "3", color: "text-blue-300" },
  { icon: CircleDollarSign, label: "미수금", before: "7", after: "0", color: "text-emerald-300" },
  { icon: Wrench, label: "처리 대기", before: "9", after: "2", color: "text-amber-300" },
];

/** 홈 히어로의 현장 운영 시각화. 숫자는 서비스 흐름을 설명하는 UI 예시다. */
export function OperationsHeroVisual() {
  return (
    <div className="relative min-h-[470px] overflow-hidden bg-[#0B172B] lg:min-h-[680px]" aria-label="JNP 건물 운영 화면 예시">
      <Image src="/images/home/hero-property-management.png" alt="공동주택 운영 현장을 확인하는 관리 담당자" fill priority sizes="(max-width: 1024px) 100vw, 54vw" className="object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B172B]/25 via-[#0B172B]/20 to-[#0B172B]/90" />
      <div className="jnp-scan absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-70" aria-hidden="true" />

      <div className="absolute left-5 right-5 top-6 flex items-center justify-between rounded-2xl border border-white/15 bg-[#0E1C34]/80 px-4 py-3 text-white shadow-xl backdrop-blur-md sm:left-8 sm:right-8 sm:top-8">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" /></span>
          <div><p className="text-xs font-bold">JNP 운영 관제</p><p className="text-[10px] text-slate-400">현장 접수부터 월간 보고까지</p></div>
        </div>
        <p className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold text-blue-200">운영 화면 예시</p>
      </div>

      <div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {SIGNALS.map(({ icon: Icon, label, before, after, color }, index) => (
            <div key={label} className="jnp-float min-w-0 rounded-xl border border-white/15 bg-[#0E1C34]/88 p-3 text-white shadow-2xl backdrop-blur-md sm:rounded-2xl sm:p-4" style={{ animationDelay: `${index * 380}ms` }}>
              <div className="flex items-center justify-between gap-1"><Icon className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${color}`} /><span className="hidden text-[10px] font-bold text-emerald-300 sm:inline">정상화 중</span></div>
              <p className="mt-3 truncate text-[11px] text-slate-400 sm:mt-5 sm:text-xs">{label}</p>
              <div className="mt-1 flex items-end gap-1 sm:gap-2"><span className="hidden text-lg font-semibold text-slate-500 line-through sm:inline">{before}</span><span className="hidden pb-1 text-xs text-slate-500 sm:inline">→</span><span className="text-2xl font-bold tabular-nums sm:text-3xl">{after}</span><span className="pb-1 text-[10px] text-slate-400 sm:text-xs">건</span></div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-white/15 bg-white/92 p-4 text-[#14233F] shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 이번 달 운영 흐름</p><span className="text-xs font-bold text-blue-600">82%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><span className="jnp-progress block h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" /></div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500"><span>현장 점검</span><span>공실 정리</span><span>수금·정산</span><span>보고 완료</span></div>
          </div>
          <div className="hidden min-w-40 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-white backdrop-blur-md sm:block"><AlertTriangle className="h-5 w-5 text-amber-300" /><p className="mt-3 text-xs font-bold">방치 신호 감지</p><p className="mt-1 text-[10px] leading-4 text-slate-300">밀린 문제부터<br />우선순위를 정합니다.</p></div>
        </div>
      </div>
    </div>
  );
}
