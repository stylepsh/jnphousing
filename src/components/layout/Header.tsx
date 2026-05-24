"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/about", label: "회사소개" },
  { href: "/services", label: "서비스" },
  { href: "/properties", label: "관리현장" },
  { href: "/tenant", label: "세입자존" },
  { href: "/agency/vacancies", label: "부동산존" },
  { href: "/landlord/dashboard", label: "임대인존" },
  { href: "/contact", label: "관리문의" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all",
        scrolled
          ? "bg-white/95 backdrop-blur shadow-sm border-b border-border"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="leading-tight">
            <div className="text-primary text-base sm:text-lg font-bold">JNP주택관리</div>
            <div className="text-[10px] text-muted-foreground font-normal -mt-0.5 hidden sm:block">
              제이앤피 주택관리 · 위탁임대 전문
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/agency/login">부동산 로그인</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/contact">관리문의</Link>
          </Button>
        </div>

        <button
          className="lg:hidden p-2 -mr-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="메뉴 열기"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-white">
          <nav className="px-6 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="py-3 text-base font-medium text-foreground/90 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
              <Button asChild variant="outline">
                <Link href="/agency/login" onClick={() => setMobileOpen(false)}>
                  부동산 로그인
                </Link>
              </Button>
              <Button asChild>
                <Link href="/contact" onClick={() => setMobileOpen(false)}>
                  관리문의
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
