"use client";

import { useState } from "react";
import { MessageCircle, X, Users, FileQuestion, Building2, Handshake } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

const TOPICS = [
  {
    icon: FileQuestion,
    title: "임차인 민원·AS",
    desc: "입주민 문의·시설 AS",
    color: "text-red-600 bg-red-50",
  },
  {
    icon: Handshake,
    title: "부동산 제휴",
    desc: "공실·매물 제휴 문의",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Building2,
    title: "신규 관리 문의",
    desc: "건물주·소유주 상담",
    color: "text-green-600 bg-green-50",
  },
];

interface Props {
  variant?: "default" | "tenant" | "agency";
}

export function KakaoChatFloat({ variant = "default" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 패널 */}
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[360px] max-w-sm rounded-2xl bg-white shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-2 fade-in"
        >
          {/* 카톡 헤더 */}
          <div className="bg-[#FEE500] text-[#3C1E1E] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-11 w-11 rounded-full bg-[#3C1E1E] flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-[#FEE500]" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#FEE500]" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{COMPANY.brand} 채팅</div>
                <div className="flex items-center gap-1 text-xs opacity-80">
                  <Users className="h-3 w-3" />
                  <span>{COMPANY.legalName} · 위탁임대 전문</span>
                </div>
              </div>
            </div>
          </div>

          {/* 안내 */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-sm text-foreground/80 leading-relaxed">
              궁금한 점이나 문의 사항을 카카오톡으로 빠르게 도와드립니다. <br />
              아래 카테고리 중 어떤 일이든 같은 채팅방에서 1:1 답변이 가능합니다.
            </p>
          </div>

          {/* 토픽 리스트 */}
          <div className="px-3 pb-3 space-y-1">
            {TOPICS.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/60 cursor-default">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="p-3 pt-1 border-t border-border bg-muted/30">
            <a
              href={COMPANY.contact.kakaoOpenChat}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-[#FEE500] text-[#3C1E1E] font-bold py-3 rounded-xl hover:brightness-95 transition"
            >
              카카오톡 채팅 시작하기
            </a>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              평일 09:00~18:00 / 그 외 시간은 다음 영업일 회신
            </p>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed z-50 transition-all",
          "bottom-4 right-4 sm:bottom-6 sm:right-6",
          "h-14 w-14 rounded-full shadow-xl",
          "flex items-center justify-center",
          open ? "bg-slate-700 text-white" : "bg-[#FEE500] text-[#3C1E1E] hover:scale-105",
        )}
        aria-label={open ? "채팅창 닫기" : "카카오톡 채팅 열기"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" fill="currentColor" />}
        {!open && variant !== "default" && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            ●
          </span>
        )}
      </button>
    </>
  );
}
