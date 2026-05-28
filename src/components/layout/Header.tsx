"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavLeaf = { href: string; label: string; desc?: string };
type NavGroup = { label: string; href?: string; items?: NavLeaf[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "회사소개",
    items: [
      { href: "/about", label: "회사소개", desc: "27년 역사와 경영 철학" },
      { href: "/certifications", label: "인증·자격", desc: "사업자등록·협회 인증" },
      { href: "/reviews", label: "고객 후기", desc: "임대인·임차인 실제 후기" },
    ],
  },
  {
    label: "서비스",
    items: [
      { href: "/services", label: "전체 서비스", desc: "위탁관리 종합 안내" },
      { href: "/services/housing", label: "주택관리", desc: "시설·청소·보안 일괄" },
      { href: "/services/rental", label: "위탁임대관리", desc: "수금·공실·정산" },
      { href: "/services/hug", label: "HUG 대위변제", desc: "보증사고 대응" },
      { href: "/services/dispute", label: "분쟁 중재", desc: "세입자 갈등 해결" },
    ],
  },
  { label: "관리현장", href: "/properties" },
  {
    label: "고객지원",
    items: [
      { href: "/news", label: "공지사항", desc: "최신 소식·보도자료" },
      { href: "/blog", label: "블로그", desc: "위탁임대 가이드" },
      { href: "/faq", label: "자주 묻는 질문", desc: "FAQ" },
    ],
  },
  {
    label: "전용 서비스",
    items: [
      { href: "/tenant", label: "세입자존", desc: "민원·AS·서류 다운로드" },
      { href: "/agency/vacancies", label: "부동산존", desc: "공실 매물 실시간 열람" },
      { href: "/landlord/dashboard", label: "임대인존", desc: "정산·리포트 확인" },
    ],
  },
];

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 홈 최상단(스크롤 전)에서는 투명 배경 + 흰 텍스트, 그 외엔 흰 배경 + 어두운 텍스트
  const transparent = isHome && !scrolled;

  function openWithDelay(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenGroup(label);
  }
  function closeWithDelay() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenGroup(null), 120);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        transparent
          ? "bg-transparent border-b border-transparent"
          : "bg-white/95 backdrop-blur shadow-sm border-b border-border",
      )}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="leading-tight">
            <div className={cn("text-base sm:text-lg font-bold transition-colors", transparent ? "text-white" : "text-primary")}>
              JNP주택관리
            </div>
            <div className={cn("text-[10px] font-normal -mt-0.5 hidden sm:block transition-colors", transparent ? "text-white/70" : "text-muted-foreground")}>
              제이앤피 주택관리 · 위탁임대 전문
            </div>
          </div>
        </Link>

        {/* 데스크톱 메가메뉴 */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_GROUPS.map((g) => {
            // 단일 링크 그룹
            if (g.href) {
              return (
                <Link
                  key={g.label}
                  href={g.href}
                  className={cn(
                    "px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors",
                    transparent ? "text-white/90 hover:bg-white/10" : "text-foreground/80 hover:text-primary hover:bg-muted",
                  )}
                >
                  {g.label}
                </Link>
              );
            }
            // 드롭다운 그룹
            const isOpen = openGroup === g.label;
            return (
              <div
                key={g.label}
                className="relative"
                onMouseEnter={() => openWithDelay(g.label)}
                onMouseLeave={closeWithDelay}
              >
                <button
                  className={cn(
                    "flex items-center gap-1 px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors",
                    transparent ? "text-white/90 hover:bg-white/10" : "text-foreground/80 hover:text-primary hover:bg-muted",
                    isOpen && (transparent ? "bg-white/10" : "text-primary bg-muted"),
                  )}
                >
                  {g.label}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>

                {/* 드롭다운 패널 */}
                {isOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 animate-slide-down">
                    <div className="w-72 rounded-2xl bg-white border border-border shadow-xl shadow-black/5 p-2 overflow-hidden">
                      {g.items!.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenGroup(null)}
                          className="block rounded-xl px-3.5 py-2.5 hover:bg-muted transition-colors group/item"
                        >
                          <div className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">
                            {item.label}
                          </div>
                          {item.desc && (
                            <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 우측 버튼 */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button asChild variant={transparent ? "outline" : "outline"} size="sm" className={transparent ? "bg-transparent border-white/40 text-white hover:bg-white/10" : ""}>
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild size="sm" className={transparent ? "bg-white text-primary hover:bg-white/90" : ""}>
            <Link href="/contact">관리문의</Link>
          </Button>
        </div>

        {/* 모바일 토글 */}
        <div className="lg:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className={cn("p-2 -mr-2", transparent ? "text-white" : "text-foreground")}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="메뉴 열기"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 (아코디언) */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-white max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="px-4 py-3 flex flex-col gap-0.5">
            {NAV_GROUPS.map((g) => {
              if (g.href) {
                return (
                  <Link
                    key={g.label}
                    href={g.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 px-2 text-base font-semibold text-foreground/90 hover:text-primary"
                  >
                    {g.label}
                  </Link>
                );
              }
              const isOpen = mobileGroup === g.label;
              return (
                <div key={g.label} className="border-b border-border/40 last:border-0">
                  <button
                    onClick={() => setMobileGroup(isOpen ? null : g.label)}
                    className="w-full flex items-center justify-between py-3 px-2 text-base font-semibold text-foreground/90"
                  >
                    {g.label}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="pb-2 pl-2">
                      {g.items!.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="block py-2 px-3 rounded-lg text-sm text-foreground/75 hover:text-primary hover:bg-muted"
                        >
                          {item.label}
                          {item.desc && <span className="block text-xs text-muted-foreground mt-0.5">{item.desc}</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
              <Button asChild variant="outline">
                <Link href="/login" onClick={() => setMobileOpen(false)}>로그인</Link>
              </Button>
              <Button asChild>
                <Link href="/contact" onClick={() => setMobileOpen(false)}>관리문의</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
