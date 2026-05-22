import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JNP주택관리 - 신뢰로 관리하는 주거공간",
    template: "%s | JNP주택관리",
  },
  description:
    "주택관리부터 위탁임대관리까지, 합리적이고 투명한 전문 서비스. 신규 건물 관리문의, 입주민 민원접수, 부동산 공실매물 조회까지.",
  metadataBase: new URL("https://jnp-housing.com"),
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
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
