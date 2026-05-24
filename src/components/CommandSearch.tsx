"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Icons } from "@/lib/icons";

const STATIC_ITEMS = [
  { group: "공개", label: "홈",        icon: Icons.home,       path: "/" },
  { group: "공개", label: "회사소개",   icon: Icons.user,       path: "/about" },
  { group: "공개", label: "팀 소개",    icon: Icons.tenants,    path: "/team" },
  { group: "공개", label: "서비스",     icon: Icons.tools,      path: "/services" },
  { group: "공개", label: "주택관리",   icon: Icons.building,   path: "/services/housing" },
  { group: "공개", label: "위탁임대",   icon: Icons.rent,       path: "/services/rental" },
  { group: "공개", label: "HUG 대위변제", icon: Icons.dispute,    path: "/services/hug" },
  { group: "공개", label: "분쟁 대응",   icon: Icons.legal,      path: "/services/dispute" },
  { group: "공개", label: "관리현장",   icon: Icons.location,   path: "/properties" },
  { group: "공개", label: "공지사항",   icon: Icons.announcement,path: "/news" },
  { group: "공개", label: "블로그",     icon: Icons.guide,      path: "/blog" },
  { group: "공개", label: "FAQ",        icon: Icons.help,       path: "/faq" },
  { group: "공개", label: "고객 후기",  icon: Icons.star,       path: "/reviews" },
  { group: "공개", label: "인증·자격증", icon: Icons.award,     path: "/certifications" },
  { group: "공개", label: "관리문의",   icon: Icons.email,      path: "/contact" },
  { group: "관리자", label: "대시보드",   icon: Icons.dashboard,  path: "/admin/dashboard" },
  { group: "관리자", label: "민원/AS",   icon: Icons.alert,      path: "/admin/complaints" },
  { group: "관리자", label: "계약",       icon: Icons.contract,   path: "/admin/leases" },
  { group: "관리자", label: "월세 현황",  icon: Icons.receipt,    path: "/admin/rent" },
  { group: "관리자", label: "공실 매물",  icon: Icons.home,       path: "/admin/vacancies" },
  { group: "관리자", label: "관리현장",   icon: Icons.building,   path: "/admin/properties" },
  { group: "관리자", label: "임차인",     icon: Icons.tenants,    path: "/admin/tenants" },
  { group: "관리자", label: "임대인",     icon: Icons.landlord,   path: "/admin/landlords" },
  { group: "관리자", label: "부동산 회원", icon: Icons.agency,    path: "/admin/agencies" },
  { group: "관리자", label: "공지 게시판",icon: Icons.announcement,path: "/admin/cms/news" },
  { group: "관리자", label: "FAQ 관리",   icon: Icons.help,       path: "/admin/cms/faq" },
  { group: "관리자", label: "감사 로그",  icon: Icons.secure,     path: "/admin/audit" },
  { group: "관리자", label: "운영 도구",  icon: Icons.tools,      path: "/admin/admin-tools" },
];

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(path: string) {
    setOpen(false);
    setValue("");
    router.push(path);
  }

  if (!open) return null;

  const grouped = STATIC_ITEMS.reduce<Record<string, typeof STATIC_ITEMS>>((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border overflow-hidden animate-scale-in">
        <Command label="전역 검색" shouldFilter={true} value={value} onValueChange={setValue}>
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="페이지·메뉴 검색…"
              className="flex-1 h-12 bg-transparent px-3 outline-none text-sm"
              value={value}
              onValueChange={setValue}
            />
            <button onClick={() => setOpen(false)} aria-label="닫기" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
              일치하는 항목이 없습니다.
            </Command.Empty>
            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group key={group} heading={group} className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {items.map(it => {
                  const Icon = it.icon;
                  return (
                    <Command.Item
                      key={it.path}
                      value={`${it.label} ${it.path}`}
                      onSelect={() => go(it.path)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{it.label}</span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">{it.path}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
          <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Cmd/Ctrl + K 로 열기 · Esc 로 닫기</span>
            <span>총 {STATIC_ITEMS.length}개</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
