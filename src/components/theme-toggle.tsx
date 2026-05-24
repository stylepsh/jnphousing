"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 다크모드 토글 (P20-8) — 3-state cyclic: light → dark → system → light...
 *
 * 마운트 전엔 placeholder 보임 (hydration mismatch 방지).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="테마 전환"
        className={cn("opacity-0", className)}
        disabled
      />
    );
  }

  const cycle = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const label = theme === "system" ? "시스템 설정 따라감"
              : resolvedTheme === "dark" ? "다크 모드"
              : "라이트 모드";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={cycle}
      aria-label={`테마 전환 (현재: ${label})`}
      title={`테마: ${label} (클릭하여 전환)`}
      className={className}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
