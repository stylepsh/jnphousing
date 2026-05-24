"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * 다크모드 Provider (P20-8).
 *
 * - localStorage 키: jnp-theme
 * - 기본: system (사용자 OS 설정 따라감)
 * - html 의 class 토글: .dark / .light
 *
 * 사용: app/layout.tsx 의 children 을 감쌈.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="jnp-theme"
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
