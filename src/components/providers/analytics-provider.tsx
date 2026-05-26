"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
const VERCEL_ANALYTICS = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID;

/**
 * PostHog + Vercel Analytics wiring (P30-98).
 *
 * env 없으면 아무것도 로드 안 함 (mock fallback).
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

  if (!POSTHOG_KEY && !VERCEL_ANALYTICS) return null;

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
      {VERCEL_ANALYTICS && (
        <Script src="https://va.vercel-scripts.com/v1/script.debug.js" strategy="afterInteractive" defer />
      )}
    </>
  );
}
