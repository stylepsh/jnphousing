/**
 * JNP 로고 — SVG. 재사용 가능. (P20-9)
 *
 * 변형:
 * - Logo            : 정사각형 모노그램 (기본 — navy 배경 + blue dot + 흰 J/P)
 * - LogoFull        : 모노그램 + 회사명 (헤더용)
 * - LogoMono        : 흑백 단색 (인쇄·팩스용)
 * - LogoWhite       : 흰색 단색 (어두운 배경용)
 *
 * 크기 변형 (className 으로 조절):
 * - small : h-6 w-6
 * - default: h-8 w-8
 * - large : h-14 w-14
 * - hero  : h-24 w-24
 */

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  title?: string;
}

const SIZES = {
  small:   "h-6 w-6",
  default: "h-8 w-8",
  large:   "h-14 w-14",
  hero:    "h-24 w-24",
} as const;

type LogoSize = keyof typeof SIZES;

interface LogoSizedProps extends LogoProps {
  size?: LogoSize;
}

/** 색상 변형 props (내부 사용) */
interface LogoColors {
  bg: string;
  dot: string;
  stroke: string;
  rx: number;
}

function LogoSvg({ className, title, colors, size = "default" }: LogoSizedProps & { colors: LogoColors }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(SIZES[size], className)}
      role="img"
      aria-label={title ?? "JNP주택관리"}
    >
      <title>{title ?? "JNP주택관리"}</title>
      <rect width="64" height="64" rx={colors.rx} fill={colors.bg} />
      {colors.dot !== "none" && (
        <circle cx="32" cy="14" r="3" fill={colors.dot} />
      )}
      <path
        d="M20 22 L20 42 Q20 48 25 48 Q30 48 30 42"
        stroke={colors.stroke}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36 48 L36 22 L43 22 Q49 22 49 28 Q49 34 43 34 L36 34"
        stroke={colors.stroke}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** 기본 — navy 배경 + blue dot + 흰 J/P (디자인 토큰 #1C2B4A / #3182F6) */
export function Logo({ className, title, size = "default" }: LogoSizedProps) {
  return (
    <LogoSvg
      className={className}
      title={title}
      size={size}
      colors={{ bg: "#1C2B4A", dot: "#3182F6", stroke: "#FFFFFF", rx: 12 }}
    />
  );
}

/** 흑백 단색 — 인쇄·팩스·서류용 */
export function LogoMono({ className, title, size = "default" }: LogoSizedProps) {
  return (
    <LogoSvg
      className={className}
      title={title}
      size={size}
      colors={{ bg: "#000000", dot: "none", stroke: "#FFFFFF", rx: 12 }}
    />
  );
}

/** 흰색 단색 — 어두운 배경용 (footer, hero overlay 등) */
export function LogoWhite({ className, title, size = "default" }: LogoSizedProps) {
  return (
    <LogoSvg
      className={className}
      title={title}
      size={size}
      colors={{ bg: "transparent", dot: "#FFFFFF", stroke: "#FFFFFF", rx: 12 }}
    />
  );
}

/** 가로형 — 모노그램 + 회사명. 헤더·푸터·이메일 서명. */
interface LogoFullProps extends LogoProps {
  /** 모노그램 변형 (기본 = primary) */
  variant?: "default" | "mono" | "white";
  /** 텍스트 색 강제 (기본은 variant 에 따라 자동) */
  textTone?: "auto" | "dark" | "light";
}

export function LogoFull({
  className,
  title,
  variant = "default",
  textTone = "auto",
}: LogoFullProps) {
  const LogoComponent = variant === "mono" ? LogoMono : variant === "white" ? LogoWhite : Logo;
  const textClass = textTone === "light"
    ? "text-white"
    : textTone === "dark"
    ? "text-slate-900"
    : variant === "white"
    ? "text-white"
    : "text-primary";
  const subClass = textTone === "light" || variant === "white"
    ? "text-white/70"
    : "text-muted-foreground";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoComponent size="default" className="h-9 w-9" title={title} />
      <div className="leading-tight">
        <div className={cn("font-bold text-lg", textClass)}>JNP주택관리</div>
        <div className={cn("text-[10px] -mt-0.5", subClass)}>제이앤피 주택관리 · 위탁임대 전문</div>
      </div>
    </div>
  );
}
