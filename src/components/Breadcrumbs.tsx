/**
 * Breadcrumbs (P24-47).
 *
 * 페이지 상단 경로 표시 + BreadcrumbList JSON-LD 자동 포함.
 * 사용:
 *   <Breadcrumbs items={[{ name: "회사소개", href: "/about" }, { name: "연혁" }]} />
 */
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { buildBreadcrumbLd, jsonLdSafeStringify } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  name: string;
  /** 마지막 항목은 href 없음 (현재 페이지) */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  /** Home 링크 숨김 */
  hideHome?: boolean;
}

export function Breadcrumbs({ items, className, hideHome = false }: BreadcrumbsProps) {
  const fullItems = hideHome ? items : [{ name: "홈", href: "/" }, ...items];
  const ldItems = fullItems.map((item, idx) => ({
    name: item.name,
    url: item.href ?? (idx === fullItems.length - 1 ? "#" : "/"),
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafeStringify(buildBreadcrumbLd(ldItems)) }}
      />
      <nav aria-label="페이지 경로" className={cn("text-xs text-muted-foreground", className)}>
        <ol className="flex flex-wrap items-center gap-1">
          {fullItems.map((item, idx) => {
            const isLast = idx === fullItems.length - 1;
            return (
              <li key={idx} className="flex items-center gap-1">
                {idx === 0 && !hideHome && (
                  <Home className="h-3 w-3" aria-hidden="true" />
                )}
                {isLast || !item.href ? (
                  <span aria-current="page" className="font-semibold text-foreground/80">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-foreground hover:underline underline-offset-2">
                    {item.name}
                  </Link>
                )}
                {!isLast && (
                  <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground/50" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
