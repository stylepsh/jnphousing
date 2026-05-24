"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export interface ChannelPoint {
  channel: string;
  inquiries: number;
  contracted: number;
}

export function ChannelBarChart({ data }: { data: ChannelPoint[] }) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">채널 데이터 없음</div>;
  }
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="channel" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={30} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="inquiries" name="문의 수" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="contracted" name="계약 성사" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
