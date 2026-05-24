import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { KakaoChatFloat } from "@/components/shared/KakaoChatFloat";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JNP주택관리 - 위기 자산을 정상화하는 위탁임대 전문가",
    template: "%s | JNP주택관리",
  },
  description:
    "HUG 대위변제·부실 건물·세입자 분쟁까지 27년 노하우로 해결하는 위탁임대 전문기업. 제이앤피 주택관리, 경기·서울·인천.",
  metadataBase: new URL("https://jnp-housing.com"),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
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
        {children}
        <KakaoChatFloat />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
