"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Copy, UserCog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setStaffRole, resetStaffPassword } from "./staff-actions";

export interface StaffAccount {
  adminId: string;
  userId: string;
  name: string;
  role: "super" | "staff" | "readonly";
  loginId: string; // 로그인할 때 치는 아이디 (…@jnphousing.com 이면 앞부분만)
  email: string;
  lastSignIn: string | null;
  isMe: boolean;
}

const ROLE_LABEL = { super: "최고 관리자", staff: "직원 (보기+입력)", readonly: "조회 전용 (보기만)" } as const;

export function StaffAccounts({ accounts }: { accounts: StaffAccount[] }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState<{ name: string; loginId: string; password: string } | null>(null);

  function changeRole(a: StaffAccount, role: "staff" | "readonly" | "none") {
    if (role === "none" && !confirm(`${a.name}님의 관리자 권한을 해제할까요? 이후 운영자 화면에 들어올 수 없습니다.`)) return;
    startTransition(async () => {
      const r = await setStaffRole(a.adminId, role);
      if (r.ok) toast.success(role === "none" ? "권한을 해제했습니다." : "권한을 바꿨습니다.");
      else toast.error(r.error);
    });
  }

  function reset(a: StaffAccount) {
    if (!confirm(`${a.name}님의 비밀번호를 새 임시 비밀번호로 바꿀까요?\n지금 쓰던 비밀번호는 더 이상 안 됩니다.`)) return;
    startTransition(async () => {
      const r = await resetStaffPassword(a.userId);
      if (r.ok) setShown({ name: a.name, loginId: a.loginId, password: r.password });
      else toast.error(r.error);
    });
  }

  return (
    <section>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <UserCog className="h-3.5 w-3.5" /> 직원 계정 · 권한 <span className="text-primary">{accounts.length}</span>명
      </p>

      {shown && (
        <div className="mb-3 rounded-xl border-2 border-primary bg-primary/5 p-4 text-sm">
          <p className="font-semibold">{shown.name}님 새 로그인 정보 — 지금 한 번만 보입니다. 직원에게 전달하세요.</p>
          <div className="mt-2 grid gap-1 font-mono text-base">
            <span>아이디: <b>{shown.loginId}</b></span>
            <span>임시 비밀번호: <b>{shown.password}</b></span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="gap-1"
              onClick={() => {
                navigator.clipboard.writeText(`아이디: ${shown.loginId}\n비밀번호: ${shown.password}\n로그인: https://jnphousing.co.kr/login`);
                toast.success("복사했습니다.");
              }}>
              <Copy className="h-3.5 w-3.5" /> 아이디·비밀번호 복사
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShown(null)}>닫기</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">직원이 로그인한 뒤 &lsquo;비밀번호 찾기&rsquo;로 본인 비밀번호로 바꾸게 안내해 주세요.</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {accounts.map((a) => (
              <li key={a.adminId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-[220px]">
                  <p className="text-sm font-semibold">
                    {a.name} {a.isMe && <span className="text-xs font-normal text-primary">(나)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    아이디 <b className="font-mono text-foreground">{a.loginId || "-"}</b>
                    {a.loginId !== a.email && a.email && <> · {a.email}</>}
                    {" · "}마지막 로그인 {a.lastSignIn ? a.lastSignIn.slice(0, 10) : "없음"}
                  </p>
                </div>
                {a.role === "super" ? (
                  <span className="text-xs rounded-md border border-purple-200 bg-purple-50 text-purple-700 px-2 py-1">{ROLE_LABEL.super}</span>
                ) : (
                  <>
                    <select value={a.role} disabled={pending} onChange={(e) => changeRole(a, e.target.value as "staff" | "readonly" | "none")}
                      className="h-8 rounded-md border bg-background px-2 text-sm" aria-label={`${a.name} 권한`}>
                      <option value="staff">{ROLE_LABEL.staff}</option>
                      <option value="readonly">{ROLE_LABEL.readonly}</option>
                      <option value="none">권한 해제 (접근 불가)</option>
                    </select>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => reset(a)} className="gap-1">
                      <KeyRound className="h-3.5 w-3.5" /> 임시 비밀번호 발급
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground mt-2">
        ※ 비밀번호는 단방향 암호화로 저장돼 누구도 원래 비밀번호를 볼 수 없습니다. 직원이 잊었으면 &lsquo;임시 비밀번호 발급&rsquo;으로 새로 만들어 전달하세요.
        경매·회원 승인은 권한과 관계없이 최고 관리자만 볼 수 있습니다.
      </p>
    </section>
  );
}
