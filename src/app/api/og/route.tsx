import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "JNP주택관리").slice(0, 80);
  const subtitle = (searchParams.get("subtitle") ?? "위기 자산을 정상화하는 위탁임대 전문가").slice(0, 100);
  const category = searchParams.get("category");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #1c2b4a 0%, #1c2b4a 50%, #0f1a2e 100%)",
          color: "white",
          padding: "72px 88px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(49, 130, 246, 0.35) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* 좌상단 브랜드 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "#3182f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            JP
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>JNP주택관리</div>
            <div style={{ fontSize: 14, color: "#cbd5e1" }}>위탁임대 27년 전문</div>
          </div>
        </div>

        {category && (
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              background: "rgba(49, 130, 246, 0.2)",
              border: "1px solid rgba(49, 130, 246, 0.5)",
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 20,
              color: "#93c5fd",
            }}
          >
            {category}
          </div>
        )}

        <div
          style={{
            display: "flex",
            fontSize: title.length > 30 ? 56 : 72,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: 20,
            maxWidth: "85%",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#cbd5e1",
            fontWeight: 500,
            maxWidth: "80%",
          }}
        >
          {subtitle}
        </div>

        {/* 하단 도메인 */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 60,
            left: 88,
            fontSize: 24,
            fontWeight: 700,
            color: "#60a5fa",
            letterSpacing: "0.05em",
          }}
        >
          jnphousing.co.kr · 010-9893-6882
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
