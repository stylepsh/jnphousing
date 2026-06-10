import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

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
    <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo size="large" className="mx-auto rounded-2xl shadow-lg shadow-primary/15" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <Card className="border-[#E8EBF0] shadow-sm">
          <CardContent className="pt-8">{children}</CardContent>
        </Card>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
