"use client";

import { usePathname } from "next/navigation";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/**
 * 페이지 전환 fade-in (P20-11).
 *
 * - pathname 이 바뀌면 motion.div 의 key 가 바뀌어 재마운트 → 진입 animation 재실행
 * - LazyMotion + domAnimation: 클라이언트 번들 최소화 (24kb 절감)
 * - AnimatePresence mode="wait": 이전 페이지 사라진 후 새 페이지 등장
 *
 * Server Component (root layout) 안에서 children 을 감싸 사용.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{
            duration: 0.25,
            ease: "easeOut",
          }}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
