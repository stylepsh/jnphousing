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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/complaints", label: "민원/AS 관리", icon: MessageSquareWarning, badge: true },
  { href: "/admin/inquiries", label: "관리문의", icon: FileQuestion },
  { href: "/admin/vacancies", label: "공실 매물", icon: Home },
  { href: "/admin/agencies", label: "부동산 회원", icon: Handshake },
  { href: "/admin/properties", label: "관리현장", icon: Building2 },
  { href: "/admin/notices", label: "공지사항", icon: Megaphone },
  { href: "/admin/downloads", label: "서류 관리", icon: FileText },
  { href: "/admin/qr", label: "QR 생성", icon: QrCode },
];

export function AdminSidebar({ pendingComplaints, adminName }: { pendingComplaints: number; adminName: string }) {
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
          <p className="mt-2 text-xs text-blue-200">{adminName} 님</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                  active
                    ? "bg-white/15 text-white"
                    : "text-blue-100 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingComplaints > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {pendingComplaints}
                  </span>
                )}
              </Link>
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
