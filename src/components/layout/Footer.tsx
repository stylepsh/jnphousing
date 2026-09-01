"use client";

import Link from "next/link";
import { useState } from "react";
import { Phone, MapPin, Mail, MessageCircle, Users, ChevronDown, FileText, Megaphone, Award, HelpCircle } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

interface FooterCol {
  title: string;
  items: { href?: string; external?: string; label: string; icon?: React.ComponentType<{ className?: string }>; highlight?: boolean }[];
}

const COLS: FooterCol[] = [
  {
    title: "회사",
    items: [
      { href: "/about",      label: "회사소개" },
      { href: "/services",   label: "서비스" },
      { href: "/properties", label: "관리현장" },
      { href: "/contact",    label: "관리문의" },
    ],
  },
  {
    title: "소식",
    items: [
      { href: "/news",       label: "공지사항", icon: Megaphone },
      { href: "/faq",        label: "자주 묻는 질문", icon: HelpCircle },
    ],
  },
  {
    title: "입주민·파트너",
    items: [
      { href: "/tenant/complaint",  label: "민원/AS 접수" },
      { href: "/tenant/notice",     label: "임차인 공지" },
      { href: "/tenant/downloads",  label: "서류 다운로드", icon: FileText },
      { href: "/agency/signup",     label: "부동산 가입" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-primary text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-12">
          {/* 회사 정보 (왼쪽 크게) */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                <span className="text-primary text-[10px] font-extrabold tracking-tighter">JNP</span>
              </span>
              <span className="font-bold text-lg text-white">{COMPANY.brand}</span>
              <span className="text-xs text-slate-500 ml-1">({COMPANY.legalName})</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {COMPANY.business.summary}
              <br />
              전국 어디든 서비스
            </p>

            <div className="mt-6 space-y-3 text-sm">
              {COMPANY.branches.map((b) => (
                <div key={b.label} className="flex items-start gap-2 text-slate-400">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-0.5">{b.label}</div>
                    <div>{b.address}</div>
                    <div className="text-xs text-slate-500">{b.detail}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4 shrink-0 text-blue-400" />
                <a href={COMPANY.contact.phoneHref} className="hover:text-white">{COMPANY.contact.phone}</a>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4 shrink-0 text-blue-400" />
                <span>{COMPANY.contact.email}</span>
              </div>
              <a
                href={COMPANY.contact.kakaoOpenChat}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-yellow-300 hover:text-yellow-200 font-medium text-sm mt-2"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="relative">
                  카카오톡 1:1 상담
                  <span className="absolute -right-2 top-0 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft"></span>
                </span>
                <Users className="h-2.5 w-2.5 text-slate-500" />
              </a>
            </div>
          </div>

          {/* 모바일에서는 accordion, 데스크톱에서는 grid */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {COLS.map((col) => (
              <FooterColumn key={col.title} col={col} />
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="space-y-1">
              <p>© {new Date().getFullYear()} {COMPANY.brand} ({COMPANY.legalName}). All rights reserved.</p>
              <p className="flex items-center gap-1.5">
                대표 {COMPANY.representative} · 사업자등록번호 {COMPANY.legal.registrationNumber}
                <Award className="h-3 w-3 text-blue-400 ml-1" />
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/privacy" className="hover:text-slate-300">개인정보처리방침</Link>
              <Link href="/terms" className="hover:text-slate-300">이용약관</Link>
              <Link href="/login" className="hover:text-slate-300">로그인</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ col }: { col: FooterCol }) {
  const [open, setOpen] = useState(true); // 데스크톱 기본 열림

  return (
    <div>
      {/* 모바일: 클릭 가능한 헤더 */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="sm:hidden w-full flex items-center justify-between py-2 text-white font-semibold text-sm"
        aria-expanded={open}
      >
        {col.title}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {/* 데스크톱: 일반 헤더 */}
      <h3 className="hidden sm:block font-semibold text-white mb-3 text-sm">{col.title}</h3>

      <ul className={cn("space-y-2 text-sm", !open && "hidden", "sm:!block")}>
        {col.items.map((item) => {
          const Icon = item.icon;
          const content = (
            <span className="inline-flex items-center gap-1.5">
              {Icon && <Icon className="h-3 w-3" />}
              {item.label}
            </span>
          );
          if (item.external) {
            return (
              <li key={item.label}>
                <a
                  href={item.external}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "hover:text-white transition-colors",
                    item.highlight ? "text-yellow-300 font-medium" : "text-slate-400"
                  )}
                >
                  {content}
                </a>
              </li>
            );
          }
          return (
            <li key={item.label}>
              <Link
                href={item.href ?? "/"}
                className={cn(
                  "hover:text-white transition-colors",
                  item.highlight ? "text-yellow-300 font-medium" : "text-slate-400"
                )}
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
