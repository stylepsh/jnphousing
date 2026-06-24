import type { MetadataRoute } from "next";

// PWA 매니페스트 — "앱 설치"로 바탕화면 아이콘 + 독립 창 실행.
// 설치 시 경매 파이프라인으로 바로 진입(관리자 업무용 프로그램 느낌).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JNP주택관리 관리자",
    short_name: "JNP관리",
    description: "JNP주택관리 경매·임대 관리 프로그램",
    start_url: "/admin/auction/pipeline",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1C3A5E",
    lang: "ko",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "경매 파이프라인", url: "/admin/auction/pipeline" },
      { name: "공실·상품화", url: "/admin/auction/pipeline/vacant" },
      { name: "임차 현황판", url: "/admin/auction/leases" },
      { name: "답사 업로드", url: "/admin/auction/survey" },
    ],
  };
}
