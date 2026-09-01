import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 클라이언트 라우터 캐시 — 동적 페이지를 잠시 캐시해 카테고리 간 재이동을 즉시 표시.
  // (Next 15 기본 dynamic=0 이라 매 이동마다 서버 재호출 → 느림)
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
    // 답사표 엑셀 업로드는 5MB 까지 허용한다(import-actions.ts 의 검사와 동일값).
    // 기본값 1MB 라 1~5MB 파일이 서버 액션 단계에서 프레임워크 오류로 잘렸다.
    serverActions: { bodySizeLimit: "5mb" },
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
