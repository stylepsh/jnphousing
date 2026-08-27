"use client";

import { useEffect } from "react";

/**
 * 화면별 스크롤 위치 기억 — 지역 목록 ↔ 물건 목록을 오갈 때 보던 자리로 돌아온다.
 * (링크로 이동하면 항상 맨 위로 튀어서 카드를 다시 찾아야 했던 문제)
 */
export function ScrollMemory({ scopeKey }: { scopeKey: string }) {
  useEffect(() => {
    const key = `auction-scroll:${scopeKey}`;
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(key) ?? 0);
    } catch {
      /* 무시 */
    }
    if (saved > 0) {
      // 목록이 그려진 뒤 복귀
      const t = setTimeout(() => window.scrollTo({ top: saved }), 60);
      return () => clearTimeout(t);
    }
  }, [scopeKey]);

  useEffect(() => {
    const key = `auction-scroll:${scopeKey}`;
    const save = () => {
      try {
        sessionStorage.setItem(key, String(window.scrollY));
      } catch {
        /* 무시 */
      }
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      window.removeEventListener("scroll", save);
    };
  }, [scopeKey]);

  return null;
}
