"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, FileText, UserCircle, Activity, Send } from "lucide-react";

const ITEMS = [
  { href: "/agency/vacancies",  label: "공실 매물",   icon: Home },
  { href: "/agency/bookmarks",  label: "찜한 매물",   icon: Heart },
  { href: "/agency/leads",      label: "연결 신청",   icon: Send },
  { href: "/agency/forms",      label: "서식 다운로드", icon: FileText },
  { href: "/agency/activity",   label: "활동 내역",   icon: Activity },
  { href: "/agency/me",         label: "마이페이지",   icon: UserCircle },
];

export function AgencyNav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-border/60 sticky top-16 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul className="flex gap-1 overflow-x-auto scrollbar-hide">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className={
                    "flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors " +
                    (active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
