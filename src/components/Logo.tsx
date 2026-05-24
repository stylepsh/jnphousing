/**
 * JNP 로고 — SVG. 재사용 가능. 사이즈는 className 으로 조절.
 *
 * 두 형태:
 * - Logo (모노그램 only, 정사각형)
 * - LogoFull (모노그램 + "JNP주택관리" 텍스트)
 */

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  title?: string;
}

/** 정사각형 모노그램 — favicon, 아바타 등 작은 곳. */
export function Logo({ className, title = "JNP주택관리" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* 둥근 배경 */}
      <rect width="64" height="64" rx="12" fill="#1C3A5E" />
      {/* 액센트 점 (지붕 느낌) */}
      <circle cx="32" cy="14" r="3" fill="#3B82F6" />
      {/* J 자 */}
      <path
        d="M20 22 L20 42 Q20 48 25 48 Q30 48 30 42"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* P 자 */}
      <path
        d="M36 48 L36 22 L43 22 Q49 22 49 28 Q49 34 43 34 L36 34"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** 가로형 — 헤더, 푸터, 인쇄용. */
export function LogoFull({ className, title = "JNP주택관리" }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo className="h-9 w-9" title={title} />
      <div className="leading-tight">
        <div className="font-bold text-primary text-lg">JNP주택관리</div>
        <div className="text-[10px] text-muted-foreground -mt-0.5">제이앤피 주택관리 · 위탁임대 전문</div>
      </div>
    </div>
  );
}
