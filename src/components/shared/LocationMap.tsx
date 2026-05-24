"use client";

import * as React from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationMapProps {
  address: string;
  detail?: string;
  lat?: number;
  lng?: number;
  className?: string;
}

/**
 * 사무실 위치 지도 (P22-29).
 *
 * 환경변수 NEXT_PUBLIC_KAKAO_MAP_KEY 가 있으면 카카오맵 JS SDK 로딩 시도.
 * 없거나 실패 시 정적 placeholder (위치 핀 + 주소 + 외부 링크).
 */
export function LocationMap({ address, detail, lat = 37.504, lng = 126.766, className }: LocationMapProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  React.useEffect(() => {
    if (!kakaoKey || failed) return;
    if (typeof window === "undefined") return;

    type KakaoMaps = {
      load: (cb: () => void) => void;
      LatLng: new (lat: number, lng: number) => unknown;
      Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
      Marker: new (opts: Record<string, unknown>) => { setMap: (m: unknown) => void };
    };
    const win = window as unknown as { kakao?: { maps?: KakaoMaps } };

    const initMap = () => {
      try {
        if (!mapRef.current || !win.kakao?.maps) return;
        win.kakao.maps.load(() => {
          const maps = win.kakao!.maps!;
          const center = new maps.LatLng(lat, lng);
          const map = new maps.Map(mapRef.current!, { center, level: 4 });
          const marker = new maps.Marker({ position: center });
          marker.setMap(map);
          setLoaded(true);
        });
      } catch (e) {
        console.warn("[LocationMap] init failed", e);
        setFailed(true);
      }
    };

    if (win.kakao?.maps) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`;
    script.async = true;
    script.onload = initMap;
    script.onerror = () => {
      console.warn("[LocationMap] sdk load failed");
      setFailed(true);
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [kakaoKey, lat, lng, failed]);

  const encodedQuery = encodeURIComponent(`${address} ${detail ?? ""}`.trim());

  return (
    <div className={className}>
      {/* 실제 지도 영역 (env 있을 때만 마운트) */}
      {kakaoKey && !failed && (
        <div
          ref={mapRef}
          className="w-full h-56 md:h-64 rounded-lg border border-border bg-muted overflow-hidden"
          aria-label="사무실 위치 지도"
        />
      )}

      {/* env 없거나 실패 시 fallback */}
      {(!kakaoKey || failed) && (
        <div className="relative w-full h-56 md:h-64 rounded-lg border border-border bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full opacity-[0.06] text-primary" aria-hidden="true">
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
          </svg>
          <div className="relative text-center px-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg mb-3 animate-pulse-soft">
              <MapPin className="h-6 w-6" />
            </div>
            <p className="font-bold">{address}</p>
            {detail && <p className="text-sm text-muted-foreground mt-1">{detail}</p>}
            {!kakaoKey && (
              <p className="text-[10px] text-muted-foreground mt-2">
                카카오맵 키 미설정 — 외부 지도 링크 사용
              </p>
            )}
          </div>
        </div>
      )}

      {loaded && kakaoKey && (
        <p className="mt-2 text-[10px] text-muted-foreground text-right">
          지도: <a href={`https://map.kakao.com/link/map/${encodedQuery},${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="underline">카카오맵 확대보기 ↗</a>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`https://map.kakao.com/?q=${encodedQuery}`} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3.5 w-3.5 mr-1" /> 카카오맵에서 보기
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={`https://maps.google.com/?q=${encodedQuery}`} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3.5 w-3.5 mr-1" /> 구글 지도
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={`nmap://search?query=${encodedQuery}`}>
            <Navigation className="h-3.5 w-3.5 mr-1" /> 네이버 지도
          </a>
        </Button>
      </div>
    </div>
  );
}
