"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Building2, KeyRound } from "lucide-react";
import { findLoginEmail, type FindEmailResult } from "./actions";

type Role = "agency" | "landlord";

export function FindEmailForm() {
  const [role, setRole] = useState<Role>("agency");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FindEmailResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("role", role);
    startTransition(async () => {
      const r = await findLoginEmail(fd);
      setResult(r);
    });
  }

  return (
    <div className="space-y-5">
      {/* 회원 유형 토글 */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: "agency", label: "부동산 회원", icon: Building2 },
          { key: "landlord", label: "임대인", icon: KeyRound },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setRole(key);
              setResult(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
              role === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {role === "agency" ? (
          <>
            <div>
              <Label htmlFor="business_number">사업자등록번호</Label>
              <Input id="business_number" name="business_number" required placeholder="123-45-67890" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="representative">대표자명</Label>
              <Input id="representative" name="representative" required placeholder="가입 시 입력한 대표자명" className="mt-1.5" />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="name">이름</Label>
              <Input id="name" name="name" required placeholder="등록된 임대인 성함" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">연락처</Label>
              <Input id="phone" name="phone" required placeholder="010-1234-5678" className="mt-1.5" />
            </div>
          </>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 조회 중...</> : "이메일 찾기"}
        </Button>
      </form>

      {result && (
        <div className="rounded-lg border p-4 text-sm">
          {result.ok && result.found ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Mail className="h-4 w-4 text-primary" /> 가입된 이메일
              </p>
              <p className="font-mono text-base text-foreground">{result.email}</p>
              <p className="text-xs text-muted-foreground">
                보안을 위해 일부만 표시됩니다. 전체 이메일이 기억나지 않으면{" "}
                <a href="/auth/forgot-password" className="text-primary hover:underline">비밀번호 재설정</a>으로 진행하세요.
              </p>
            </div>
          ) : result.ok ? (
            <p className="text-muted-foreground">
              일치하는 회원 정보를 찾을 수 없습니다. 입력 내용을 확인하거나 계정 발급 담당자에게 문의해 주세요.
            </p>
          ) : (
            <p className="text-destructive">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
