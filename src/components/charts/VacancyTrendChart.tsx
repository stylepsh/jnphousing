"use client";

/**
 * 공실률 추이 차트 (P29-87).
 * 12개월 line chart (recharts).
 */
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface VacancyPoint {
  month: string;   // YYYY-MM
  rate: number;    // 0-100
  occupied: number;
  vacant: number;
}

export function VacancyTrendChart({ data }: { data: VacancyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 rounded-lg bg-muted/30 border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
        12개월 공실률 데이터 적재 후 표시됩니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip
          formatter={(v: unknown) => typeof v === "number" ? `${v.toFixed(1)}%` : String(v)}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="var(--primary)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--primary)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
