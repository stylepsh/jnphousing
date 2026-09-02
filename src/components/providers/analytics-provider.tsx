"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
const VERCEL_ANALYTICS = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;                       // G-XXXXXXXXXX
const NAVER_ID = process.env.NEXT_PUBLIC_NAVER_CONVERSION_ID;      // 네이버 전환 스크립트 ID

/**
 * PostHog + Vercel Analytics wiring (P30-98).
 *
 * GA4 / 네이버 전환은 env 가 있을 때만 로드한다(없으면 아무 스크립트도 안 붙음).
 * 광고 유입 → 전화·카카오 클릭을 전환으로 잡기 위해, CTA 마다 코드를 넣지 않고
 * document 레벨 위임 리스너 하나로 tel: / open.kakao.com 링크 클릭을 모두 잡는다.
 * (버튼이 늘어나도 추적이 새지 않는다.)
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 페이지 변경 시 PostHog $pageview 자동 캡처
  React.useEffect(() => {
    if (!POSTHOG_KEY || typeof window === "undefined") return;
    type PH = { capture?: (event: string, props: Record<string, unknown>) => void };
    const w = window as unknown as { posthog?: PH };
    w.posthog?.capture?.("$pageview", {
      $current_url: window.location.href,
      pathname,
      search: searchParams.toString(),
    });
  }, [pathname, searchParams]);

  // 페이지 변경 시 GA4 page_view (SPA 라우팅은 자동 감지가 안 된다)
  React.useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", "page_view", {
      page_path: pathname + (searchParams.toString() ? `?${searchParams}` : ""),
      page_location: window.location.href,
    });
  }, [pathname, searchParams]);

  // 전화·카카오 상담 클릭 = 광고 전환. 위임 리스너 하나로 전 페이지 커버.
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("a");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      let channel: "phone" | "kakao" | null = null;
      if (href.startsWith("tel:")) channel = "phone";
      else if (href.includes("open.kakao.com")) channel = "kakao";
      if (!channel) return;

      const props = { channel, href, page: window.location.pathname };
      const w = window as unknown as {
        gtag?: (...a: unknown[]) => void;
        posthog?: { capture?: (e: string, p: Record<string, unknown>) => void };
        wcs?: { cnv?: (t: string, v: string) => string };
        wcs_do?: (o?: unknown) => void;
      };

      // GA4 — 광고 플랫폼에서 전환으로 잡을 수 있는 표준 이벤트명
      w.gtag?.("event", "generate_lead", { ...props, value: 1 });
      w.posthog?.capture?.("consult_click", props);

      // 네이버 — 전환 유형 2(신청/상담), 값 0
      if (NAVER_ID && w.wcs?.cnv && w.wcs_do) {
        try {
          const cnv = w.wcs.cnv("2", "0");
          (window as unknown as { _nasa?: Record<string, string> })._nasa ??= {};
          (window as unknown as { _nasa: Record<string, string> })._nasa.cnv = cnv;
          w.wcs_do();
        } catch {
          // 전환 전송 실패가 링크 이동을 막아선 안 된다.
        }
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!POSTHOG_KEY && !VERCEL_ANALYTICS && !GA_ID && !NAVER_ID) return null;

  return (
    <>
      {POSTHOG_KEY && (
        <Script id="posthog-init" strategy="afterInteractive">
          {`
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('${POSTHOG_KEY}', {
              api_host: '${POSTHOG_HOST}',
              capture_pageview: false,
              persistence: 'localStorage+cookie',
              autocapture: true,
            });
          `}
        </Script>
      )}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { send_page_view: false });
            `}
          </Script>
        </>
      )}
      {NAVER_ID && (
        <>
          <Script src="//wcs.naver.net/wcslog.js" strategy="afterInteractive" />
          <Script id="naver-wcs-init" strategy="afterInteractive">
            {`
              if (!window.wcs_add) window.wcs_add = {};
              window.wcs_add["wa"] = "${NAVER_ID}";
              if (window.wcs) { window.wcs_do(); }
            `}
          </Script>
        </>
      )}
      {VERCEL_ANALYTICS && (
        <Script src="https://va.vercel-scripts.com/v1/script.debug.js" strategy="afterInteractive" defer />
      )}
    </>
  );
}
