"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertBanner } from "../actions";
import { toast } from "sonner";

interface Initial {
  id?: string;
  title?: string;
  body?: string | null;
  link_url?: string | null;
  link_label?: string | null;
  theme?: string;
  is_active?: boolean;
  start_at?: string | null;
  end_at?: string | null;
}

const THEMES = [
  { key: "info",      label: "ℹ️ 일반 안내", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "important", label: "📢 중요 공지", color: "bg-red-50 text-red-700 border-red-200" },
  { key: "event",     label: "🎉 이벤트",   color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "holiday",   label: "🏖 휴무 안내", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

export function BannerForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // 미리보기용 실시간 state
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [theme, setTheme] = useState(initial?.theme ?? "info");
  const [linkLabel, setLinkLabel] = useState(initial?.link_label ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertBanner(initial?.id ?? null, fd);
      if (res.ok) {
        toast.success("배너 저장 완료");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const themeColor = THEMES.find(t => t.key === theme)?.color ?? THEMES[0].color;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* 입력 폼 */}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
          <div>
            <Label htmlFor="is_active" className="text-base font-semibold cursor-pointer">배너 노출</Label>
            <p className="text-xs text-muted-foreground mt-0.5">켜면 홈페이지 진입 시 팝업이 뜹니다</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-slate-300 peer-checked:bg-emerald-500 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div>
          <Label htmlFor="theme">유형</Label>
          <select
            id="theme"
            name="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {THEMES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <Label htmlFor="title">제목 *</Label>
          <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="설 연휴 휴무 안내" />
        </div>

        <div>
          <Label htmlFor="body">내용</Label>
          <Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="2/9~2/12 휴무합니다. 긴급 민원은 카톡으로..." />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="link_url">버튼 링크 (선택)</Label>
            <Input id="link_url" name="link_url" defaultValue={initial?.link_url ?? ""} type="url" placeholder="https://open.kakao.com/..." />
          </div>
          <div>
            <Label htmlFor="link_label">버튼 문구</Label>
            <Input id="link_label" name="link_label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="카톡 문의하기" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_at">노출 시작 (선택)</Label>
            <Input id="start_at" name="start_at" type="date" defaultValue={initial?.start_at?.slice(0, 10) ?? ""} />
          </div>
          <div>
            <Label htmlFor="end_at">노출 종료 (선택)</Label>
            <Input id="end_at" name="end_at" type="date" defaultValue={initial?.end_at?.slice(0, 10) ?? ""} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">* 기간을 비우면 켜져 있는 동안 계속 노출됩니다.</p>

        <Button type="submit" disabled={pending} className="w-full" size="lg">
          {pending ? "저장 중..." : "배너 저장"}
        </Button>
      </form>

      {/* 실시간 미리보기 */}
      <div>
        <Label className="mb-2 block">미리보기</Label>
        <div className="rounded-2xl border border-border bg-slate-100 p-8 flex items-center justify-center min-h-[360px]">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className={`px-5 py-3 border-b text-sm font-bold ${themeColor}`}>
              {THEMES.find(t => t.key === theme)?.label}
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg text-slate-900">{title || "제목을 입력하세요"}</h3>
              {body && <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{body}</p>}
              {linkLabel && (
                <div className="mt-4">
                  <span className="inline-block rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2">
                    {linkLabel}
                  </span>
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>오늘 하루 안 보기</span>
                <span>닫기 ✕</span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-center text-muted-foreground">
          {isActive ? "🟢 현재 노출 ON — 홈페이지에 팝업이 뜹니다" : "⚪ 노출 OFF — 저장해도 팝업이 안 뜹니다"}
        </p>
      </div>
    </div>
  );
}
