import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 클라이언트 라우터 캐시 — 동적 페이지를 잠시 캐시해 카테고리 간 재이동을 즉시 표시.
  // (Next 15 기본 dynamic=0 이라 매 이동마다 서버 재호출 → 느림)
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
