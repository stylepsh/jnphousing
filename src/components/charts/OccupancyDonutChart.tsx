"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function OccupancyDonutChart({ occupied, vacant, expiring }: { occupied: number; vacant: number; expiring: number }) {
  const data = [
    { name: "임차중", value: occupied, fill: "#16a34a" },
    { name: "만료 임박", value: expiring, fill: "#f59e0b" },
    { name: "공실", value: vacant, fill: "#94a3b8" },
  ].filter((d) => d.value > 0);
  const total = occupied + vacant + expiring;

  if (total === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">호실 데이터 없음</div>;
  }

  return (
    <div className="w-full h-64 relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}호실`} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
        <p className="text-2xl font-bold tabular-nums">{total > 0 ? Math.round(((occupied + expiring) * 100) / total) : 0}%</p>
        <p className="text-xs text-muted-foreground">임차율</p>
      </div>
    </div>
  );
}
