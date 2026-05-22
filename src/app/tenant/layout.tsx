import Link from "next/link";
import { Building2, Phone } from "lucide-react";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 세입자 전용 서브헤더 */}
      <header className="bg-primary text-white sticky top-0 z-50 shadow-md">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link href="/tenant" className="flex items-center gap-2 font-bold">
            <Building2 className="h-5 w-5" />
            <span>입주민 서비스</span>
          </Link>
          <a href="tel:02-0000-0000" className="flex items-center gap-1.5 text-sm bg-white/15 px-3 py-1.5 rounded-full hover:bg-white/25 transition">
            <Phone className="h-4 w-4" />
            관리실
          </a>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-border py-6 mt-8">
        <div className="mx-auto max-w-3xl px-4 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} JNP주택관리</p>
          <p className="mt-1">긴급 시 관리실 010-XXXX-XXXX</p>
        </div>
      </footer>
    </div>
  );
}
