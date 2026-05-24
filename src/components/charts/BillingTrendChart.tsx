"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export interface BillingPoint {
  label: string;       // "2026-04"
  billing: number;     // 청구
  paid: number;        // 수금
}

export function BillingTrendChart({ data }: { data: BillingPoint[] }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis
            tickFormatter={(v) => `${Math.floor(v / 10000)}만`}
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            width={50}
          />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? `${v.toLocaleString("ko-KR")}원` : String(v))}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="billing" stroke="#1c3a5e" name="청구" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="paid" stroke="#16a34a" name="수금" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
