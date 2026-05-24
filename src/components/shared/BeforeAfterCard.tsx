"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Clock } from "lucide-react";
import type { Transformation } from "@/lib/data/transformations";

export function BeforeAfterCard({ t }: { t: Transformation }) {
  return (
    <Card className="overflow-hidden border-border/60 hover:shadow-xl transition-shadow">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 relative">
          {/* Before */}
          <div className="relative aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${t.beforeHue}, 40%, 30%) 0%, hsl(${t.beforeHue}, 30%, 18%) 100%)` }}>
            <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect x="40" y="40" width="60" height="100" fill="white" fillOpacity="0.15" rx="2" />
              {[...Array(4)].map((_, row) => [...Array(2)].map((_, col) => (
                <rect key={`b-${row}-${col}`} x={48 + col * 22} y={50 + row * 20} width="12" height="12" fill="#FBBF24" fillOpacity={((row + col) % 4) ? 0.1 : 0.35} rx="1" />
              )))}
              <rect x="115" y="60" width="50" height="80" fill="white" fillOpacity="0.1" rx="2" />
              <rect x="0" y="140" width="200" height="10" fill="white" fillOpacity="0.05" />
            </svg>
            <Badge variant="outline" className="absolute top-2 left-2 bg-black/40 text-white border-white/30 text-[10px] backdrop-blur">
              BEFORE
            </Badge>
          </div>
          {/* After */}
          <div className="relative aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${t.afterHue}, 65%, 45%) 0%, hsl(${t.afterHue}, 55%, 30%) 100%)` }}>
            <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect x="40" y="40" width="60" height="100" fill="white" fillOpacity="0.3" rx="2" />
              {[...Array(4)].map((_, row) => [...Array(2)].map((_, col) => (
                <rect key={`a-${row}-${col}`} x={48 + col * 22} y={50 + row * 20} width="12" height="12" fill="#FBBF24" fillOpacity={((row + col) % 4) ? 0.7 : 0.85} rx="1" />
              )))}
              <rect x="115" y="60" width="50" height="80" fill="white" fillOpacity="0.25" rx="2" />
              <rect x="0" y="140" width="200" height="10" fill="white" fillOpacity="0.15" />
            </svg>
            <Badge className="absolute top-2 right-2 bg-emerald-500 text-white border-emerald-400 text-[10px]">
              AFTER
            </Badge>
          </div>

          {/* 중앙 화살표 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-3 gap-2">
            <h3 className="text-base font-bold">{t.title}</h3>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" /> {t.durationMonths}개월
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Before</div>
              <p className="text-foreground/85 leading-snug">{t.beforeLabel}</p>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-emerald-700 uppercase mb-1">After</div>
              <p className="text-foreground/85 leading-snug">{t.afterLabel}</p>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-border/60 pt-3">
            {t.metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-muted-foreground line-through tabular-nums">{m.before}</span>
                  {m.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-emerald-600" />
                  )}
                  <span className="font-bold text-foreground tabular-nums">{m.after}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
