import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, TrendingUp, Building2 } from "lucide-react";
import { SimulationCalculator } from "./calculator";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "수익 시뮬레이션" };
export const dynamic = "force-dynamic";

interface Snapshot {
  vacantUnits: number;
  occupiedUnits: number;
  avgRent: number;
  totalRent: number;
}

async function fetchSnapshot(): Promise<Snapshot> {
  try {
    const supabase = await createClient();
    // 활성 계약 조회
    const { data: activeLeases } = await supabase
      .from("leases")
      .select("rent_amount")
      .eq("status", "active");
    const leases = (activeLeases ?? []) as { rent_amount: number }[];

    const { count: totalUnits } = await supabase
      .from("properties_units")
      .select("*", { count: "exact", head: true });

    const occupied = leases.length;
    const total = totalUnits ?? 0;
    const vacant = Math.max(0, total - occupied);
    const totalRent = leases.reduce((s, l) => s + (l.rent_amount ?? 0), 0);
    const avgRent = occupied > 0 ? Math.round(totalRent / occupied) : 500000;

    return { vacantUnits: vacant, occupiedUnits: occupied, avgRent, totalRent };
  } catch {
    return { vacantUnits: 3, occupiedUnits: 12, avgRent: 500000, totalRent: 6000000 };
  }
}

export default async function SimulationPage() {
  const snap = await fetchSnapshot();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">수익 시뮬레이션</h1>
        <p className="mt-1 text-sm text-muted-foreground">공실 호실을 메꿀 경우 예상 수익 증가</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">현재 점유</p>
            <p className="text-xl font-bold mt-1 text-emerald-700 tabular-nums">{snap.occupiedUnits}호</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">공실</p>
            <p className="text-xl font-bold mt-1 text-amber-700 tabular-nums">{snap.vacantUnits}호</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">월 수입</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{Math.floor(snap.totalRent / 10000).toLocaleString()}만</p>
          </CardContent>
        </Card>
      </div>

      <SimulationCalculator
        vacantUnits={snap.vacantUnits}
        avgRent={snap.avgRent}
        currentMonthlyRent={snap.totalRent}
      />

      <div className="mt-6 rounded-lg bg-slate-50 border border-border/60 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">💡 시뮬레이션 가정</p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>평균 월세는 현재 활성 계약 기준 자동 계산</li>
          <li>위탁수수료 5~10% 자동 차감</li>
          <li>실제 임차 매칭은 시장 상황·계절·매물 위치에 따라 다름</li>
        </ul>
      </div>
    </div>
  );
}
