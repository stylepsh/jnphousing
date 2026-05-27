"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  MessageSquareWarning,
  FileQuestion,
  Home,
  Handshake,
  Building2,
  Megaphone,
  FileText,
  QrCode,
  Menu,
  X,
  LogOut,
  FileSignature,
  Receipt,
  UserSquare,
  Users,
  Wallet,
  Bell,
  Settings,
  ShieldCheck,
  Award,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type BadgeKey = "complaints" | "overdue" | "expiring" | "pendingAgencies" | "newInquiries";

type NavGroup = { group: string; items: { href: string; label: string; icon: typeof LayoutDashboard; badgeKey?: BadgeKey; badgeColor?: "red" | "amber" | "blue" }[] };

const NAV: NavGroup[] = [
  {
    group: "운영",
    items: [
      { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
      { href: "/admin/complaints", label: "민원/AS", icon: MessageSquareWarning, badgeKey: "complaints", badgeColor: "red" },
      { href: "/admin/inquiries", label: "관리문의", icon: FileQuestion, badgeKey: "newInquiries", badgeColor: "blue" },
      { href: "/admin/notifications", label: "알림 이력", icon: Bell },
    ],
  },
  {
    group: "계약·월세",
    items: [
      { href: "/admin/leases", label: "계약", icon: FileSignature, badgeKey: "expiring", badgeColor: "amber" },
      { href: "/admin/rent", label: "월세 현황", icon: Receipt, badgeKey: "overdue", badgeColor: "red" },
      { href: "/admin/rent/bulk", label: "청구 일괄작업", icon: Receipt },
      { href: "/admin/rent/match", label: "은행입금 매칭", icon: Wallet },
      { href: "/admin/commissions", label: "위탁수수료", icon: Wallet },
      { href: "/admin/landlords", label: "임대인", icon: UserSquare },
      { href: "/admin/tenants", label: "임차인", icon: Users },
      { href: "/admin/tenants/import", label: "임차인 CSV 등록", icon: Users },
    ],
  },
  {
    group: "매물·관리현장",
    items: [
      { href: "/admin/vacancies", label: "공실 매물", icon: Home },
      { href: "/admin/channels", label: "광고 채널 통계", icon: Megaphone },
      { href: "/admin/agencies", label: "부동산 회원", icon: Handshake, badgeKey: "pendingAgencies", badgeColor: "amber" },
      { href: "/admin/properties", label: "관리현장", icon: Building2 },
      { href: "/admin/units/board", label: "호실 현황판", icon: LayoutDashboard },
      { href: "/admin/buildings-managed", label: "위탁관리 건물", icon: Building2 },
    ],
  },
  {
    group: "DM 단기임대",
    items: [
      { href: "/admin/dm", label: "DM 대시보드", icon: LayoutDashboard },
      { href: "/admin/dm/settlement", label: "월별 정산", icon: Wallet },
    ],
  },
  {
    group: "콘텐츠",
    items: [
      { href: "/admin/notices", label: "임차인 공지", icon: Megaphone },
      { href: "/admin/cms/news", label: "공지 게시판", icon: Megaphone },
      { href: "/admin/cms/faq", label: "FAQ 관리", icon: FileQuestion },
      { href: "/admin/cms/milestones", label: "회사 연혁", icon: Award },
      { href: "/admin/cms/certs", label: "인증서·자격증", icon: ShieldCheck },
      { href: "/admin/downloads", label: "서류 관리", icon: FileText },
      { href: "/admin/qr", label: "QR 생성", icon: QrCode },
    ],
  },
  {
    group: "시스템",
    items: [
      { href: "/admin/favorites", label: "즐겨찾기", icon: LayoutDashboard },
      { href: "/admin/admin-tools", label: "운영 도구", icon: Settings },
      { href: "/admin/audit", label: "감사 로그", icon: ShieldCheck },
    ],
  },
];

interface BadgeCounts {
  complaints: number;
  overdue: number;
  expiring: number;
  pendingAgencies: number;
  newInquiries: number;
}

const BADGE_BG: Record<"red" | "amber" | "blue", string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
};

export function AdminSidebar({ counts, adminName }: { counts: BadgeCounts; adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* 모바일 토글 */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-screen bg-primary text-white flex flex-col",
          "transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Building2 className="h-5 w-5 text-blue-300" />
            <span>JNP 관리자</span>
          </Link>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
              {adminName.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{adminName}</p>
              <p className="text-[10px] text-blue-300">로그인 중</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="px-2 mb-1 text-[10px] font-semibold text-blue-300 uppercase tracking-wider">
                {g.group}
              </p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                  const badgeValue = item.badgeKey ? counts[item.badgeKey] : 0;
                  const badgeBg = BADGE_BG[item.badgeColor ?? "red"];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                        active
                          ? "bg-white/15 text-white"
                          : "text-blue-100 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badgeValue > 0 && (
                        <span className={cn("text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", badgeBg)}>
                          {badgeValue > 99 ? "99+" : badgeValue}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
