"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "invalid" | "done";

export function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    // /auth/callback 에서 code 교환이 끝났다면 세션이 존재한다.
    supabase.auth.getSession().then(({ data }) => {
      if (settled) return;
      if (data.session) {
        settled = true;
        setPhase("ready");
      }
    });

    // 복구 이벤트도 대비 (링크 직접 진입 등)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setPhase("ready");
      }
    });

    // 1.5초 안에 세션이 없으면 무효 링크로 처리
    const t = setTimeout(() => {
      if (!settled) setPhase("invalid");
    }, 1500);

    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") ?? "");
    const pw2 = String(fd.get("password2") ?? "");
    if (pw.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (pw !== pw2) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw new Error(error.message);
      setPhase("done");
      // 보안상 재설정 후 세션 종료 — 새 비밀번호로 다시 로그인
      await supabase.auth.signOut();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error("재설정 실패", { description: msg });
    } finally {
      setPending(false);
    }
  }

  if (phase === "checking") {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" /> 링크 확인 중...
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="h-12 w-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">링크가 만료되었거나 유효하지 않습니다</p>
          <p className="text-sm text-muted-foreground">
            재설정 링크는 일정 시간 후 만료됩니다. 또는 메일을 받은 브라우저와 동일한 브라우저에서 링크를 눌러야 합니다.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">재설정 메일 다시 받기</Link>
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">비밀번호가 변경되었습니다</p>
          <p className="text-sm text-muted-foreground">새 비밀번호로 다시 로그인해 주세요.</p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">로그인하러 가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password">새 비밀번호</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" placeholder="8자 이상" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="password2">새 비밀번호 확인</Label>
        <Input id="password2" name="password2" type="password" required autoComplete="new-password" className="mt-1.5" />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 변경 중...</> : "비밀번호 변경"}
      </Button>
    </form>
  );
}
