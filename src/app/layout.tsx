import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { KakaoChatFloat } from "@/components/shared/KakaoChatFloat";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PageTransition } from "@/components/providers/page-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JNP주택관리 - 위기 자산을 정상화하는 위탁임대 전문가",
    template: "%s | JNP주택관리",
  },
  description:
    "HUG 대위변제·부실 건물·세입자 분쟁까지 27년 노하우로 해결하는 위탁임대 전문기업. 제이앤피 주택관리, 경기·서울·인천.",
  metadataBase: new URL("https://jnphousing.co.kr"),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "JNP주택관리",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "JNP주택관리" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-default.png"],
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      "naver-site-verification": process.env.NAVER_SITE_VERIFICATION ?? "",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider>
          {/* P20-7 a11y skip link */}
          <a href="#main-content" className="skip-to-content">
            본문으로 바로가기
          </a>
          {/* P20-11 페이지 전환 fade-in */}
          <PageTransition>{children}</PageTransition>
          <KakaoChatFloat />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
