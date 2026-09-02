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
  Ban,
  Megaphone,
  FileText,
  QrCode,
  Menu,
  X,
  LogOut,
  FileSignature,
  UserSquare,
  Users,
  Wallet,
  Bell,
  Settings,
  ShieldCheck,
  Award,
  ChevronDown,
  Gavel,
  ClipboardList,
  Workflow,
  ListTodo,
  UserCheck,  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type BadgeKey = "complaints" | "overdue" | "expiring" | "pendingAgencies" | "newInquiries" | "openTodos" | "pendingMembers";

type NavLeaf = { href: string; label: string; icon: typeof LayoutDashboard; badgeKey?: BadgeKey; badgeColor?: "red" | "amber" | "blue"; superOnly?: boolean };
type NavGroup = {
  group: string;
  items: NavLeaf[];
  pinned?: boolean;   // true → 항상 펼침(토글 없음). 티어① 매일 / 처리
  divider?: boolean;  // 위에 구분선 — 홈페이지 관리(CMS) 섹션 분리용
  superOnly?: boolean; // super 관리자에게만 노출 (경매 등)
};

const NAV: NavGroup[] = [
  // ───────── ① 매일 (항상 노출) — 업무 흐름 순: 할일 → 소유주(물건) → 수금 ─────────
  {
    group: "매일",
    pinned: true,
    items: [
      { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
      { href: "/admin/todos", label: "할 일", icon: ListTodo, badgeKey: "openTodos", badgeColor: "blue" },
      { href: "/admin/owners", label: "소유주(임대인)", icon: UserSquare },
      { href: "/admin/rent", label: "수금·청구", icon: Wallet, badgeKey: "overdue", badgeColor: "red" },
    ],
  },
  {
    group: "처리",
    pinned: true,
    items: [
      { href: "/admin/leases", label: "계약", icon: FileSignature, badgeKey: "expiring", badgeColor: "amber" },
      { href: "/admin/tenants", label: "임차인", icon: Users },
      { href: "/admin/complaints", label: "민원/AS", icon: MessageSquareWarning, badgeKey: "complaints", badgeColor: "red" },
      { href: "/admin/inquiries", label: "관리문의", icon: FileQuestion, badgeKey: "newInquiries", badgeColor: "blue" },
      { href: "/admin/members", label: "회원 승인", icon: UserCheck, badgeKey: "pendingMembers", badgeColor: "amber", superOnly: true },
    ],
  },
  // ───────── ② 가끔 (그룹·접힘 기본) ─────────
  {
    group: "현장·매물",
    items: [
      { href: "/admin/properties", label: "관리현장", icon: Building2 },
      { href: "/admin/vacancies", label: "공실 매물", icon: Home },
    ],
  },
  {
    group: "장부·정산",
    items: [
      { href: "/admin/ledger", label: "월별 손익", icon: Wallet },
      { href: "/admin/dm", label: "JNP 단기임대", icon: LayoutDashboard },
      { href: "/admin/dm/settlement", label: "월별 정산", icon: Wallet },
    ],
  },
  // ───────── ③ 더보기 — 가끔만 쓰는 화면 전부 (하단·접힘) ─────────
  {
    group: "더보기",
    items: [
      { href: "/admin/units/board", label: "호실 현황판", icon: LayoutDashboard },
      { href: "/admin/channels", label: "광고 채널 통계", icon: Megaphone },
      { href: "/admin/agencies", label: "부동산 회원", icon: Handshake, badgeKey: "pendingAgencies", badgeColor: "amber" },
      { href: "/admin/notifications", label: "알림 이력", icon: Bell },
      { href: "/admin/audit", label: "감사 로그", icon: ShieldCheck },
      { href: "/admin/admin-tools", label: "운영 도구", icon: Settings },
      { href: "/admin/favorites", label: "즐겨찾기", icon: LayoutDashboard },
    ],
  },
  // ───────── ④ 홈페이지 관리 (OS와 분리) ─────────
  {
    group: "홈페이지 관리",
    divider: true,
    items: [
      { href: "/admin/banner", label: "팝업 배너", icon: Megaphone },
      { href: "/admin/notices", label: "임차인 공지", icon: Megaphone },
      { href: "/admin/cms/news", label: "공지 게시판", icon: Megaphone },
      { href: "/admin/cms/faq", label: "FAQ 관리", icon: FileQuestion },
      { href: "/admin/cms/milestones", label: "회사 연혁", icon: Award },
      { href: "/admin/cms/certs", label: "인증서·자격증", icon: ShieldCheck },
      { href: "/admin/qr", label: "QR 생성", icon: QrCode },
      { href: "/admin/downloads", label: "서류 관리", icon: FileText },
    ],
  },
  // ───────── ⑤ 경매 (나만 사용 — 맨 하단) ─────────
  {
    group: "경매",
    superOnly: true,
    divider: true,
    items: [
      { href: "/admin/auction/collection", label: "경매 물건 수집", icon: Gavel },
      { href: "/admin/auction/survey", label: "답사 결과 입력", icon: ClipboardList },
      { href: "/admin/auction/judgment", label: "임대인 판정·전수", icon: UserCheck },
      { href: "/admin/auction/pipeline", label: "파이프라인", icon: Workflow },
      { href: "/admin/auction/leases", label: "임차 현황판", icon: Building2 },
      { href: "/admin/auction/sheets", label: "답사지 발급 이력", icon: ClipboardList },
      { href: "/admin/auction/revenue", label: "수익·정산", icon: Wallet },
      { href: "/admin/auction/rental-import", label: "임대 취합 업로드", icon: Upload },
      { href: "/admin/auction/blocked", label: "차단 임대인", icon: Ban },
    ],
  },
];

interface BadgeCounts {
  complaints: number;
  overdue: number;
  expiring: number;
  pendingAgencies: number;
  newInquiries: number;
  openTodos: number;
  pendingMembers: number;
}

const BADGE_BG: Record<"red" | "amber" | "blue", string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
};

export function AdminSidebar({ counts, adminName, isSuper }: { counts: BadgeCounts; adminName: string; isSuper: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // super 전용 그룹·항목 필터 (staff 에게는 경매·회원승인 자체가 안 보임)
  const nav = NAV
    .filter((g) => isSuper || !g.superOnly)
    .map((g) => ({ ...g, items: g.items.filter((i) => isSuper || !i.superOnly) }));

  // 현재 경로가 포함된 그룹만 기본으로 펼침
  const activeGroup = nav.find(g => g.items.some(i =>
    pathname === i.href || (i.href !== "/admin/dashboard" && pathname.startsWith(i.href))
  ))?.group ?? "";
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([activeGroup]));

  function toggleGroup(name: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // 그룹별 합산 배지 (접혀있을 때 그룹 헤더에 표시)
  function groupBadgeTotal(g: typeof NAV[0]): number {
    return g.items.reduce((sum, i) => sum + (i.badgeKey ? counts[i.badgeKey] : 0), 0);
  }

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
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <span className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0">
              <span className="text-primary text-[11px] font-extrabold tracking-tighter">JNP</span>
            </span>
            <span className="leading-tight">
              JNP 관리자
              <span className="block text-[10px] font-normal text-blue-300/80 -mt-0.5">제이앤피 주택관리 OS</span>
            </span>
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

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {nav.map((g) => {
            const total = groupBadgeTotal(g);
            // pinned 그룹은 항상 펼침(토글 없음). 그 외에는 접힘 토글.
            const isOpen = g.pinned || openGroups.has(g.group);

            const itemList = (
              <div className={cn("space-y-0.5", g.pinned ? "" : "mt-0.5 mb-2 animate-slide-down")}>
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
                        "flex items-center gap-3 pr-3 py-1.5 rounded-lg text-sm font-medium transition",
                        g.pinned ? "pl-3" : "pl-7",
                        active
                          ? "bg-white/15 text-white"
                          : "text-blue-100 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
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
            );

            return (
              <div key={g.group}>
                {/* 홈페이지 관리(CMS) 등 분리 섹션 앞 구분선 */}
                {g.divider && <div className="my-2 border-t border-white/10" />}

                {g.pinned ? (
                  // 티어① — 항상 노출, 토글 없는 옅은 라벨
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/70">
                    {g.group}
                  </div>
                ) : (
                  // 티어②③④ — 클릭하여 펴기/접기
                  <button
                    onClick={() => toggleGroup(g.group)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition",
                      isOpen ? "text-blue-200 bg-white/[0.04]" : "text-blue-300 hover:bg-white/[0.04]",
                    )}
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform shrink-0", !isOpen && "-rotate-90")} />
                    <span className="flex-1 text-left">{g.group}</span>
                    {!isOpen && total > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {total > 99 ? "99+" : total}
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-blue-300/60">{g.items.length}</span>
                  </button>
                )}

                {isOpen && itemList}
              </div>
            );
          })}
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
