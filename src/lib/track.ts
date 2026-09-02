"use client";

/**
 * 광고 전환 이벤트 전송 — 클라이언트 전용.
 *
 * 전화·카카오 클릭은 analytics-provider 의 위임 리스너가 잡는다.
 * 폼 접수는 클릭이 아니라 서버 응답이 성공한 시점이라, 여기서 명시적으로 보낸다.
 *
 * 개인정보(이름·연락처·주소)는 절대 보내지 않는다. 어느 폼인지(source)만 남긴다.
 * 스크립트가 로드되지 않은 환경(env 미설정)에서는 조용히 아무 일도 하지 않는다.
 */
export function trackLead(source: "contact" | "auction"): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as {
    gtag?: (...a: unknown[]) => void;
    posthog?: { capture?: (e: string, p: Record<string, unknown>) => void };
    wcs?: { cnv?: (t: string, v: string) => string };
    wcs_do?: (o?: unknown) => void;
    _nasa?: Record<string, string>;
  };

  const props = { source, page: window.location.pathname };

  try {
    w.gtag?.("event", "generate_lead", { ...props, value: 1 });
    w.posthog?.capture?.("lead_submitted", props);

    // 네이버 전환 유형 2(신청/상담), 값 0
    if (w.wcs?.cnv && w.wcs_do) {
      w._nasa ??= {};
      w._nasa.cnv = w.wcs.cnv("2", "0");
      w.wcs_do();
    }
  } catch {
    // 추적 실패가 사용자 흐름(접수 완료 표시)을 막아선 안 된다.
  }
}
