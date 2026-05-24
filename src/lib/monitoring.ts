/**
 * Sentry / 모니터링 wrapper (P30-97).
 *
 * Sentry SDK 설치 + DSN 있을 때만 활성. 없으면 console fallback.
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

interface CaptureOptions {
  level?: "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/** 에러 캡처. Sentry SDK 가 lazy load (없으면 console). */
export async function captureException(err: unknown, options: CaptureOptions = {}) {
  if (!DSN) {
    if (options.level === "warning") console.warn("[monitoring]", err, options);
    else console.error("[monitoring]", err, options);
    return;
  }
  try {
    // @sentry/nextjs 가 설치되어 있고 NEXT_PUBLIC_SENTRY_DSN env 가 있을 때만 동작.
    // 박성혁이 npm install @sentry/nextjs 후 활성. 미설치 상태에서는 console fallback.
    const Sentry = await import("@sentry/nextjs" as string).catch(() => null) as { captureException?: (e: unknown, opts: unknown) => void } | null;
    if (!Sentry?.captureException) {
      console.error("[monitoring] sentry not installed", err);
      return;
    }
    Sentry.captureException(err, {
      level: options.level,
      tags: options.tags,
      extra: options.extra,
    });
  } catch (e) {
    console.warn("[monitoring] capture failed", e);
  }
}

/** 이벤트 추적 (PostHog 호환). */
export function trackEvent(name: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    type PostHogWin = { posthog?: { capture?: (n: string, p: Record<string, unknown>) => void } };
    const w = window as unknown as PostHogWin;
    w.posthog?.capture?.(name, properties);
  } catch (e) {
    console.warn("[trackEvent]", e);
  }
}

/** Vercel Analytics 이벤트 (Web Vitals 등). */
export function trackVitals(metric: { name: string; value: number; id: string }) {
  if (!process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID) return;
  try {
    const body = new Blob([JSON.stringify(metric)], { type: "application/json" });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/_vitals", body);
    }
  } catch {
    // ignore
  }
}
