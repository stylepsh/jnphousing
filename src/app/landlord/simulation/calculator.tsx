"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp } from "lucide-react";

interface SimulationProps {
  vacantUnits: number;
  avgRent: number;
  currentMonthlyRent: number;
}

export function SimulationCalculator({ vacantUnits, avgRent, currentMonthlyRent }: SimulationProps) {
  const [fillCount, setFillCount] = React.useState(Math.max(1, Math.min(vacantUnits, 2)));
  const [rent, setRent] = React.useState(avgRent);
  const [commissionPct, setCommissionPct] = React.useState(7);

  const additionalRent = fillCount * rent;
  const newMonthlyTotal = currentMonthlyRent + additionalRent;
  const commission = Math.round(newMonthlyTotal * commissionPct / 100);
  const netIncrease = additionalRent - Math.round(additionalRent * commissionPct / 100);
  const yearlyNet = netIncrease * 12;

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">메꿀 공실 수</Label>
            <Input
              type="number"
              value={fillCount}
              onChange={(e) => setFillCount(Math.max(0, Math.min(vacantUnits, Number(e.target.value))))}
              min={0}
              max={vacantUnits}
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">최대 {vacantUnits}호</p>
          </div>
          <div>
            <Label className="text-xs">호당 월세 (원)</Label>
            <Input
              type="number"
              value={rent}
              onChange={(e) => setRent(Number(e.target.value))}
              step="50000"
              min={0}
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">평균 {avgRent.toLocaleString()}원</p>
          </div>
          <div>
            <Label className="text-xs">위탁수수료 (%)</Label>
            <Input
              type="number"
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
              step="0.5"
              min={0}
              max={20}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">예상 효과</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">현재 월 수입</p>
              <p className="text-lg font-bold tabular-nums">{currentMonthlyRent.toLocaleString()}원</p>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">메꾼 후 월 수입</p>
                <p className="text-lg font-bold tabular-nums text-primary">{newMonthlyTotal.toLocaleString()}원</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-primary/15 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">신규 월 임대료</span><span className="font-bold tabular-nums text-emerald-700">+{additionalRent.toLocaleString()}원</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">위탁수수료 ({commissionPct}%)</span><span className="tabular-nums text-red-600">-{Math.round(additionalRent * commissionPct / 100).toLocaleString()}원</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-primary/15">
              <span>월 순증</span>
              <span className="tabular-nums text-primary">+{netIncrease.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">연간 순증</span>
              <span className="tabular-nums text-primary">+{yearlyNet.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {vacantUnits === 0 ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
            ✅ 현재 모든 호실이 점유 중입니다. 추가 수익 시뮬레이션은 갱신 협의 시 활용.
          </div>
        ) : (
          <Badge className="bg-primary text-primary-foreground">
            JNP에 위탁 시 평균 30~60일 내 공실 매칭 (지난 사례 기준)
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
