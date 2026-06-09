"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, Wrench, MessageCircle, CheckCircle2, ArrowRight, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

type Cta = { kind: "phone" | "link"; label: string; href: string };
type Svc = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  desc: string;
  items: string[];
  result: string;
  cta: Cta;
};

const SERVICES: Svc[] = [
  {
    id: "expertise",
    icon: Briefcase,
    badge: "임대인",
    title: "위탁 운용",
    desc: "방치된 건물을 대신 운영해 매달 수익으로 바꿉니다. HUG·경매·공실까지 직접.",
    items: ["임대료 수금 · 월 정산", "HUG 대위변제 대응", "경매 · 공실 건물 수익화", "부실 건물 정상화", "세입자 분쟁 · 명도 해결"],
    result: "매달 수익 정산",
    cta: { kind: "phone", label: "무료 상담", href: "tel:01098936882" },
  },
  {
    id: "facility",
    icon: Wrench,
    badge: "건물주",
    title: "주택 관리",
    desc: "청소부터 소방·승강기까지 6종 시설을 매주 직접 관리합니다.",
    items: ["공용부 청소 · 정기 방역", "전기 · 소방 안전점검", "승강기 · 급배수 설비", "통신 · CCTV 관리", "건물 하자 · 누수 긴급대응"],
    result: "6종 직접 관리",
    cta: { kind: "link", label: "서비스 보기", href: "/services/housing" },
  },
  {
    id: "tenant",
    icon: MessageCircle,
    badge: "입주민",
    title: "임차인 응대",
    desc: "민원·서류·분쟁까지 입주민 창구를 대신 맡아 빠르게 처리합니다.",
    items: ["민원 · AS 온라인 접수", "24시간 소통 창구 운영", "계약 · 정산 서류 발급", "세입자 분쟁 중재", "입주 · 퇴거 정산 처리"],
    result: "빠른 전담 응대",
    cta: { kind: "link", label: "민원 접수", href: "/tenant/complaint" },
  },
];

function Card({ s, active }: { s: Svc; active: boolean }) {
  const Icon = s.icon;
  return (
    <div
      className={cn(
        "rounded-3xl p-8 flex flex-col h-full transition-colors duration-500",
        active ? "bg-primary text-white shadow-2xl shadow-primary/30" : "bg-white border border-[#E8EBF0] shadow-lg",
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <span className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", active ? "bg-white/15" : "bg-[#F4F6FA]")}>
          <Icon className={cn("h-6 w-6", active ? "text-white" : "text-primary")} />
        </span>
        <span className={cn("text-[11px] font-bold tracking-wide rounded-full px-3 py-1", active ? "bg-white/15 text-white" : "bg-[#F4F6FA] text-foreground/50")}>{s.badge}</span>
      </div>
      <h3 className={cn("text-2xl font-bold tracking-tight", active ? "text-white" : "text-foreground")}>{s.title}</h3>
      <p className={cn("mt-2.5 text-sm leading-relaxed", active ? "text-white/70" : "text-muted-foreground")}>{s.desc}</p>
      <ul className="mt-6 space-y-3 flex-1">
        {s.items.map((it) => (
          <li key={it} className={cn("flex items-start gap-2.5 text-[15px] font-medium", active ? "text-white" : "text-foreground")}>
            <CheckCircle2 className={cn("h-5 w-5 shrink-0 mt-0.5", active ? "text-white/90" : "text-primary/70")} /> {it}
          </li>
        ))}
      </ul>
      <div className={cn("mt-7 pt-5 border-t flex items-center justify-between gap-3", active ? "border-white/15" : "border-[#F0F2F6]")}>
        <span className={cn("text-sm font-bold", active ? "text-white" : "text-foreground")}>{s.result}</span>
        {s.cta.kind === "phone" ? (
          <a href={s.cta.href} className={cn("inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors", active ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-white hover:bg-primary/90")}>
            <Phone className="h-4 w-4" /> {s.cta.label}
          </a>
        ) : (
          <Link href={s.cta.href} className={cn("inline-flex items-center gap-1.5 text-sm font-bold hover:gap-2.5 transition-all", active ? "text-white" : "text-primary")}>
            {s.cta.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * 3대 핵심 서비스 — 코버플로우 캐러셀.
 * 카드 3개가 돌아가며 가운데 오는 카드가 크게(네이비) 강조된다.
 */
export function CoreServicesCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % SERVICES.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* 데스크톱: 코버플로우 (가운데 크게) */}
      <div className="hidden lg:block relative h-[540px]">
        {SERVICES.map((s, idx) => {
          const diff = (idx - active + SERVICES.length) % SERVICES.length; // 0=중앙, 1=오른쪽, 2=왼쪽
          const isCenter = diff === 0;
          const dx = diff === 0 ? 0 : diff === 1 ? 340 : -340;
          const scale = isCenter ? 1 : 0.82;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`${s.title} 보기`}
              className="absolute top-1/2 left-1/2 w-[380px] h-[500px] text-left transition-all duration-500 ease-out"
              style={{
                transform: `translate(calc(-50% + ${dx}px), -50%) scale(${scale})`,
                zIndex: isCenter ? 30 : 10,
                opacity: isCenter ? 1 : 0.5,
              }}
            >
              <Card s={s} active={isCenter} />
            </button>
          );
        })}
      </div>

      {/* 모바일: 활성 카드 1개 */}
      <div className="lg:hidden">
        <Card s={SERVICES[active]} active />
      </div>

      {/* 인디케이터 */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {SERVICES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(idx)}
            aria-label={`${s.title}`}
            className={cn("h-2 rounded-full transition-all", idx === active ? "w-7 bg-primary" : "w-2 bg-[#D9DEE8] hover:bg-[#C3CAD6]")}
          />
        ))}
      </div>
    </>
  );
}
