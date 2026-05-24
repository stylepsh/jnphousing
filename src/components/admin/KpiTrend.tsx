/**
 * 대시보드 KPI 카드 전월 대비 변화 표시 (P25-50).
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiTrendProps {
  current: number;
  previous: number;
  /** 단위 (예: '%', '건') */
  unit?: string;
  /** 변화 방향 — 'higher-better' 일 때 증가가 emerald */
  direction?: "higher-better" | "lower-better";
}

export function KpiTrend({ current, previous, unit = "%p", direction = "higher-better" }: KpiTrendProps) {
  if (previous === 0) return null;
  const delta = current - previous;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  const isGood = (direction === "higher-better" && delta > 0) || (direction === "lower-better" && delta < 0);
  const isBad = (direction === "higher-better" && delta < 0) || (direction === "lower-better" && delta > 0);

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
      isGood && "text-emerald-600",
      isBad && "text-red-600",
      delta === 0 && "text-muted-foreground"
    )}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}{unit}
    </span>
  );
}
