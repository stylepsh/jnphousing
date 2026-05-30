import { Card, CardContent } from "@/components/ui/card";
import { COMPANY } from "@/lib/company";
import { ShieldCheck } from "lucide-react";

/** 인증 보조 페이지(비밀번호 찾기/재설정/아이디 찾기) 공통 셸 — /login 과 동일한 톤. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
        </div>

        <Card>
          <CardContent className="pt-8">{children}</CardContent>
        </Card>

        {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
      </div>
    </div>
  );
}
