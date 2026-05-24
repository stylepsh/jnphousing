"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const ID_DOMAIN = "jnphousing.com";

function normalizeId(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return v.includes("@") ? v : `${v}@${ID_DOMAIN}`;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [idValue, setIdValue] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const email = normalizeId(String(fd.get("identifier") ?? ""));
      const password = String(fd.get("password") ?? "");

      if (!email) throw new Error("아이디를 입력해 주세요.");
      if (!password) throw new Error("비밀번호를 입력해 주세요.");

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("invalid")) {
          throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        throw new Error(error.message);
      }
      if (!data.user) throw new Error("로그인 실패");

      const userId = data.user.id;

      const [{ data: adminRows }, { data: agencyRows }, { data: landlordRows }] = await Promise.all([
        supabase.from("admin_users").select("id, role").eq("user_id", userId).limit(1),
        supabase.from("agencies").select("status").eq("user_id", userId).limit(1),
        supabase.from("landlord_users").select("landlord_id").eq("user_id", userId).limit(1),
      ]);

      if (adminRows && adminRows.length > 0) {
        toast.success("관리자로 로그인되었습니다.");
        router.push(next ?? "/admin/dashboard");
        router.refresh();
        return;
      }

      if (agencyRows && agencyRows.length > 0) {
        const status = (agencyRows[0] as { status: string }).status;
        if (status === "approved") {
          toast.success("부동산 회원으로 로그인되었습니다.");
          router.push(next ?? "/agency/vacancies");
        } else if (status === "rejected") {
          router.push("/agency/rejected");
        } else {
          router.push("/agency/pending");
        }
        router.refresh();
        return;
      }

      if (landlordRows && landlordRows.length > 0) {
        toast.success("임대인으로 로그인되었습니다.");
        router.push(next ?? "/landlord/dashboard");
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      throw new Error("계정에 연결된 권한이 없습니다. 관리자에게 문의해 주세요.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다.";
      toast.error("로그인 실패", { description: msg });
    } finally {
      setPending(false);
    }
  }

  const showDomain = idValue.length > 0 && !idValue.includes("@");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="identifier">아이디</Label>
        <div className="relative mt-1.5">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="admin"
            className="pl-9"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value)}
          />
          {showDomain && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              @{ID_DOMAIN}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          ID 만 입력하시면 됩니다. (예: <code className="font-mono">admin</code> → <code className="font-mono">admin@{ID_DOMAIN}</code>)
        </p>
      </div>

      <div>
        <Label htmlFor="password">비밀번호</Label>
        <div className="relative mt-1.5">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="pl-9"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 로그인 중...
          </>
        ) : (
          "로그인"
        )}
      </Button>
    </form>
  );
}
