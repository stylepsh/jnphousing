"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface ComplaintStatusPollProps {
  currentStatus: string;
  /** 폴링 간격 ms (기본 8초) */
  intervalMs?: number;
}

/**
 * 임차인 민원 상태 실시간 업데이트 (P27-77).
 * 페이지를 일정 간격으로 router.refresh() 호출 → 서버 데이터 재페치.
 * Supabase Realtime 보다 단순하고 안정적인 polling.
 */
export function ComplaintStatusPoll({ intervalMs = 8000 }: ComplaintStatusPollProps) {
  const router = useRouter();
  const [active, setActive] = React.useState(true);
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      // 탭이 보이지 않으면 skip
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastRefresh(new Date());
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  const minutes = Math.floor((Date.now() - lastRefresh.getTime()) / 60000);

  return (
    <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <RefreshCw className={`h-3 w-3 ${active ? "animate-spin-slow" : ""}`} style={{ animationDuration: "3s" }} />
      <span>실시간 ({intervalMs / 1000}초마다 갱신)</span>
      <button
        type="button"
        onClick={() => setActive(v => !v)}
        className="ml-1 underline hover:text-foreground"
      >
        {active ? "끄기" : "켜기"}
      </button>
    </div>
  );
}
