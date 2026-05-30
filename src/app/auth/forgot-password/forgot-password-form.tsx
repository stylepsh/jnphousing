"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email) return;
    setPending(true);
    try {
      const supabase = createClient();
      // 재설정 링크 → /auth/callback 이 code 교환 후 /auth/reset-password 로 이동
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
    } catch {
      // 의도적 무시 — 이메일 존재 여부를 노출하지 않기 위해 항상 동일하게 처리
    } finally {
      setSent(true);
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <MailCheck className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">재설정 메일을 보냈습니다</p>
          <p className="text-sm text-muted-foreground">
            입력하신 이메일의 메일함(스팸함 포함)을 확인해 주세요. 링크를 누르면 새 비밀번호를 설정할 수 있습니다.
          </p>
          <p className="text-xs text-muted-foreground">
            해당 이메일로 가입된 계정이 있는 경우에만 메일이 도착합니다. 몇 분 내 안 오면 다시 시도해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="가입 시 사용한 이메일" className="mt-1.5" />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 전송 중...</> : "재설정 링크 받기"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        이메일이 기억나지 않으시면{" "}
        <a href="/auth/find-email" className="text-primary font-medium hover:underline">아이디(이메일) 찾기</a>
      </p>
    </form>
  );
}
