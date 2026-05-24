/**
 * 건물 클러스터 SVG illustration (P21-13).
 * Hero 우측, 회사소개 등에서 재사용.
 * 실제 건물 사진 확보 전까지 사용 (BLOCKERS B-002).
 */
import { cn } from "@/lib/utils";

interface BuildingClusterProps {
  className?: string;
  /** 창문 glow 색상 (기본 amber #FBBF24) */
  windowColor?: string;
  /** 건물 색상 (rgba 또는 hex) */
  buildingColor?: string;
}

export function BuildingCluster({
  className,
  windowColor = "#FBBF24",
  buildingColor = "white",
}: BuildingClusterProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={cn("w-full h-full", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-label="JNP 관리 건물 일러스트"
      role="img"
    >
      <title>JNP주택관리 건물 일러스트</title>
      {/* 뒷쪽 큰 건물 */}
      <g opacity="0.55">
        <rect x="100" y="80" width="100" height="180" fill={buildingColor} fillOpacity="0.18" rx="2" />
        {[...Array(7)].map((_, row) =>
          [...Array(4)].map((_, col) => {
            const seed = row * 4 + col;
            const lit = (seed * 7 + 3) % 5 < 3;
            return (
              <rect
                key={`b1-${row}-${col}`}
                x={108 + col * 22}
                y={92 + row * 22}
                width="14"
                height="14"
                fill={windowColor}
                fillOpacity={lit ? 0.55 : 0.15}
                rx="1"
              />
            );
          })
        )}
        <rect x="95" y="75" width="110" height="8" fill={buildingColor} fillOpacity="0.25" rx="1" />
      </g>

      {/* 중간 건물 */}
      <g>
        <rect x="210" y="110" width="90" height="160" fill={buildingColor} fillOpacity="0.22" rx="2" />
        {[...Array(6)].map((_, row) =>
          [...Array(4)].map((_, col) => {
            const seed = row * 4 + col + 11;
            const lit = (seed * 13 + 5) % 5 < 3;
            return (
              <rect
                key={`b2-${row}-${col}`}
                x={216 + col * 20}
                y={120 + row * 22}
                width="12"
                height="12"
                fill={windowColor}
                fillOpacity={lit ? 0.7 : 0.2}
                rx="1"
              />
            );
          })
        )}
        <rect x="205" y="105" width="100" height="8" fill={buildingColor} fillOpacity="0.3" rx="1" />
      </g>

      {/* 앞쪽 작은 건물 */}
      <g opacity="0.9">
        <rect x="50" y="150" width="60" height="120" fill={buildingColor} fillOpacity="0.28" rx="2" />
        {[...Array(4)].map((_, row) =>
          [...Array(2)].map((_, col) => {
            const seed = row * 2 + col + 23;
            const lit = (seed * 17 + 9) % 5 < 3;
            return (
              <rect
                key={`b3-${row}-${col}`}
                x={58 + col * 22}
                y={162 + row * 24}
                width="14"
                height="14"
                fill={windowColor}
                fillOpacity={lit ? 0.85 : 0.25}
                rx="1"
              />
            );
          })
        )}
        <rect x="46" y="145" width="68" height="7" fill={buildingColor} fillOpacity="0.35" rx="1" />
        <rect x="74" y="246" width="12" height="24" fill="#1C2B4A" fillOpacity="0.6" rx="1" />
      </g>

      {/* 지반 */}
      <rect x="0" y="270" width="400" height="30" fill={buildingColor} fillOpacity="0.1" />
    </svg>
  );
}

/** 작은 배경용 그리드 패턴 (Hero 배경, 카드 등) */
export function GridPattern({ className, opacity = 0.08 }: { className?: string; opacity?: number }) {
  return (
    <svg className={cn("absolute inset-0 w-full h-full", className)} style={{ opacity }} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}
