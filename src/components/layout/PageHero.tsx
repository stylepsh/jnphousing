import Image from "next/image";
import Link from "next/link";
import { Activity, CheckCircle2, Gauge, ShieldCheck } from "lucide-react";

export interface PageHeroTab {
  href: string;
  label: string;
}

/**
 * 하위 페이지 공통 히어로 — 전면폭 사진 배너 + 제목 + 하단 탭 내비게이션.
 *
 * 기존에는 페이지마다 `bg-primary` 단색 블록을 복붙해 써서, 회사 소개 사이트라기보다
 * 색만 칠한 문서처럼 보였다. 건물관리 업계 사이트들이 공통으로 쓰는
 * "사진 배너 + 겹친 탭" 구조로 통일해 기업 사이트의 인상을 준다.
 *
 * 탭은 같은 카테고리 안의 형제 페이지로만 구성한다(현재 페이지는 흰 배경으로 강조).
 */
export function PageHero({
  eyebrow,
  title,
  description,
  image = "/images/home/hero-property-management.png",
  tabs,
  activeHref,
  priority = true,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  tabs?: PageHeroTab[];
  activeHref?: string;
  priority?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-[#E8ECF2] bg-[#0F1A2E]">
      <div className="absolute inset-0 -z-10">
        <Image
          src={image}
          alt=""
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A162A]/98 via-[#0F1A2E]/90 to-[#0F1A2E]/72" />
      </div>
      <div className="jnp-grid absolute inset-0 -z-10 opacity-20" aria-hidden="true" />
      <div className="jnp-orb absolute -right-24 top-0 -z-10 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" aria-hidden="true" />

      <div className="mx-auto grid min-h-[410px] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_0.72fr] lg:py-18">
        <div className="animate-fade-in">
          {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">{eyebrow}</p>}
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl">{title}</h1>
          {description && <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p>}
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> 현장 확인</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><Gauge className="h-3.5 w-3.5 text-blue-300" /> 진행 기록</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-amber-300" /> 결과 보고</span>
          </div>
        </div>

        <div className="relative hidden h-64 lg:block" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-300/25 bg-blue-400/10 shadow-[0_0_80px_rgba(96,165,250,.25)] backdrop-blur"><div className="text-center"><Activity className="mx-auto h-7 w-7 text-blue-300" /><p className="mt-2 text-sm font-bold text-white">JNP 운영</p></div></div>
          <div className="absolute inset-5 rounded-full border border-dashed border-white/20" />
          {[
            ["left-0 top-8", "공실"],
            ["right-0 top-12", "수금"],
            ["bottom-2 left-8", "시설"],
            ["bottom-3 right-7", "민원"],
          ].map(([position, label], index) => <span key={label} className={`jnp-float absolute ${position} rounded-xl border border-white/15 bg-[#10203A]/90 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur`} style={{ animationDelay: `${index * 420}ms` }}>{label}<span className="ml-2 text-emerald-300">●</span></span>)}
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <nav aria-label="하위 메뉴" className="mx-auto max-w-6xl px-0 sm:px-6">
          <ul className="flex overflow-x-auto border-t border-white/15 bg-[#0B172B]/65 backdrop-blur sm:rounded-t-2xl">
            {tabs.map((t) => {
              const active = t.href === activeHref;
              return (
                <li key={t.href} className="flex-1">
                  <Link
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "block whitespace-nowrap px-5 py-4 text-center text-sm font-semibold transition-colors " +
                      (active
                        ? "bg-white text-primary"
                        : "text-white/75 hover:bg-white/10 hover:text-white")
                    }
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </section>
  );
}

/** 회사 소개 계열 하위 메뉴 */
export const COMPANY_TABS: PageHeroTab[] = [
  { href: "/about", label: "회사소개" },
  { href: "/team", label: "구성원" },
  { href: "/certifications", label: "인증·등록" },
  { href: "/reviews", label: "운영사례·후기" },
];

/** 서비스 계열 하위 메뉴 */
export const SERVICE_TABS: PageHeroTab[] = [
  { href: "/services", label: "서비스 전체" },
  { href: "/services/rental", label: "위탁임대" },
  { href: "/services/housing", label: "주택관리" },
  { href: "/services/hug", label: "HUG 대응" },
  { href: "/services/dispute", label: "분쟁 조정" },
];

/** 문의·안내 계열 하위 메뉴 */
export const SUPPORT_TABS: PageHeroTab[] = [
  { href: "/contact", label: "관리문의" },
  { href: "/faq", label: "자주 묻는 질문" },
  { href: "/properties", label: "관리현장" },
  { href: "/news", label: "공지사항" },
];
