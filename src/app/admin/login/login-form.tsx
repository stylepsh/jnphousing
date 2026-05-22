"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const email = String(fd.get("email") ?? "");
      const password = String(fd.get("password") ?? "");

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("로그인 실패");

      const { data: adminRows } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", data.user.id)
        .limit(1);
      if (!adminRows || adminRows.length === 0) {
        await supabase.auth.signOut();
        throw new Error("관리자 권한이 없습니다.");
      }

      router.push(next ?? "/admin/dashboard");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다.";
      toast.error("로그인 실패", { description: msg });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="password">비밀번호</Label>
        <Input id="password" name="password" type="password" required className="mt-1.5" />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 로그인 중...</> : "로그인"}
      </Button>
    </form>
  );
}
