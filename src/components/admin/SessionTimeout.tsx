"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const IDLE_LIMIT_MS = 30 * 60 * 1000;  // 30분 무활동 → 로그아웃
const WARN_BEFORE_MS = 5 * 60 * 1000;   // 5분 전 경고
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export function SessionTimeout() {
  const router = useRouter();
  const [showWarn, setShowWarn] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(WARN_BEFORE_MS / 1000);
  const lastActivityRef = React.useRef(Date.now());

  // 활동 추적
  React.useEffect(() => {
    const onActivity = () => {
      lastActivityRef.current = Date.now();
      if (showWarn) setShowWarn(false);
    };
    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, onActivity, { passive: true });
    }
    return () => {
      for (const evt of ACTIVITY_EVENTS) document.removeEventListener(evt, onActivity);
    };
  }, [showWarn]);

  // 1초마다 체크
  React.useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_LIMIT_MS) {
        // 자동 로그아웃
        try {
          createClient().auth.signOut().catch(() => {});
        } catch {}
        router.push("/login?error=session_expired");
        clearInterval(tick);
        return;
      }
      if (elapsed >= IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        setShowWarn(true);
        setSecondsLeft(Math.ceil((IDLE_LIMIT_MS - elapsed) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [router]);

  function extend() {
    lastActivityRef.current = Date.now();
    setShowWarn(false);
  }

  if (!showWarn) return null;

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  return (
    <div className="fixed bottom-4 right-4 z-[150] w-[340px] rounded-2xl bg-card shadow-2xl border border-amber-200 p-5 animate-slide-up">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">세션 만료 임박</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            보안을 위해 30분 무활동 시 자동 로그아웃됩니다.
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" />
        <span className="text-sm tabular-nums font-bold text-amber-900">
          {m}분 {String(s).padStart(2, "0")}초 후 로그아웃
        </span>
      </div>
      <Button onClick={extend} className="w-full" size="sm">
        세션 연장 (계속 작업)
      </Button>
    </div>
  );
}
