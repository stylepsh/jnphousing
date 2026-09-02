import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #1c3a5e 0%, #1c3a5e 50%, #0f1a2e 100%)",
          color: "white",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "999px",
            padding: "8px 20px",
            fontSize: "20px",
            fontWeight: "600",
            marginBottom: "32px",
          }}
        >
          위탁임대 전문기업
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            textAlign: "center",
            fontSize: "78px",
            fontWeight: "800",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          <div>위기 자산을 <span style={{ color: "#93c5fd" }}>정상화</span>하는</div>
          <div>위탁임대 전문가</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "32px",
            fontSize: "28px",
            color: "#cbd5e1",
            fontWeight: "500",
          }}
        >
          HUG 대위변제 · 부실 건물 · 세입자 분쟁 해결
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "60px",
            fontSize: "32px",
            fontWeight: "700",
            color: "#60a5fa",
            letterSpacing: "0.05em",
          }}
        >
          JNP주택관리 · jnphousing.co.kr
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
