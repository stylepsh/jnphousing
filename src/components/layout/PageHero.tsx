import Image from "next/image";
import Link from "next/link";

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
    <section className="relative isolate border-b border-[#E8ECF2] bg-[#0F1A2E]">
      {/* 배경 사진 — 텍스트 대비를 위해 네이비 오버레이를 얹는다 */}
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
        <div className="absolute inset-0 bg-[#0F1A2E]/78" />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-24">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">
            {description}
          </p>
        )}
      </div>

      {/* 하단 탭 — 배너에 걸치는 형태. 모바일에서는 가로 스크롤로 넘긴다. */}
      {tabs && tabs.length > 0 && (
        <nav aria-label="하위 메뉴" className="mx-auto max-w-5xl px-0 sm:px-6">
          <ul className="flex overflow-x-auto border-t border-white/15 sm:rounded-t-lg">
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
                        : "bg-white/10 text-white hover:bg-white/20")
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
  { href: "/reviews", label: "고객 후기" },
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
