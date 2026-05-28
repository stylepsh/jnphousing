"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Banner {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  theme: string;
  start_at: string | null;
  end_at: string | null;
}

const THEME_STYLE: Record<string, { bar: string; label: string }> = {
  info:      { bar: "bg-blue-50 text-blue-700 border-blue-200",       label: "안내" },
  important: { bar: "bg-red-50 text-red-700 border-red-200",          label: "중요 공지" },
  event:     { bar: "bg-purple-50 text-purple-700 border-purple-200", label: "이벤트" },
  holiday:   { bar: "bg-amber-50 text-amber-700 border-amber-200",    label: "휴무 안내" },
};

export function PopupBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("site_popup_banner")
          .select("id, title, body, link_url, link_label, theme, start_at, end_at")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled || !data) return;

        // 노출 기간 체크
        const now = Date.now();
        if (data.start_at && new Date(data.start_at).getTime() > now) return;
        if (data.end_at && new Date(data.end_at).getTime() + 86400000 < now) return;

        // "오늘 하루 안 보기" 체크
        const key = `jnp_popup_${data.id}`;
        if (localStorage.getItem(key) === new Date().toDateString()) return;

        setBanner(data as Banner);
        setOpen(true);
      } catch {
        // 테이블 없거나 오류 시 조용히 무시
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!open || !banner) return null;

  const style = THEME_STYLE[banner.theme] ?? THEME_STYLE.info;

  function close() {
    setOpen(false);
  }
  function dismissToday() {
    if (banner) localStorage.setItem(`jnp_popup_${banner.id}`, new Date().toDateString());
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-5 py-3 border-b text-sm font-bold flex items-center justify-between ${style.bar}`}>
          <span>{style.label}</span>
          <button onClick={close} aria-label="닫기" className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <h3 className="font-bold text-lg text-slate-900">{banner.title}</h3>
          {banner.body && (
            <p className="mt-2.5 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{banner.body}</p>
          )}
          {banner.link_url && banner.link_label && (
            <a
              href={banner.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-lg bg-primary text-white text-sm font-semibold px-5 py-2.5 hover:bg-primary/90 transition-colors"
            >
              {banner.link_label}
            </a>
          )}
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <button onClick={dismissToday} className="text-slate-500 hover:text-slate-800 transition-colors font-medium">
            오늘 하루 안 보기
          </button>
          <button onClick={close} className="text-slate-500 hover:text-slate-800 transition-colors font-medium">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
