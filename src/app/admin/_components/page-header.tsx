import type { LucideIcon } from "lucide-react";

type Accent = "blue" | "rose" | "emerald" | "amber" | "violet" | "slate";

const ACCENT: Record<Accent, string> = {
  blue: "from-blue-600 to-blue-500",
  rose: "from-rose-600 to-rose-500",
  emerald: "from-emerald-600 to-emerald-500",
  amber: "from-amber-500 to-amber-400",
  violet: "from-violet-600 to-violet-500",
  slate: "from-slate-700 to-slate-600",
};

/** 관리자 페이지 공통 헤더 — 아이콘 칩 + 제목 + 설명(+우측 액션). */
export function PageHeader({
  icon: Icon,
  title,
  desc,
  accent = "blue",
  children,
}: {
  icon: LucideIcon;
  title: string;
  desc?: React.ReactNode;
  accent?: Accent;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span
        className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${ACCENT[accent]} text-white flex items-center justify-center shrink-0 shadow-sm`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-black leading-tight tracking-tight">{title}</h1>
        {desc && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
