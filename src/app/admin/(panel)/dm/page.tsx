import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Home, Users, Wallet, AlertCircle, Plus, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LANDLORD_BUSINESS_SEED } from "@/lib/data/landlord-business";
import { PROFIT_SHARE_DEFS } from "@/lib/data/dm-profit-share";

export const metadata: Metadata = { title: "DM 단기임대" };
export const dynamic = "force-dynamic";

interface DmUnitRow {
  id: string;
  property_id: string | null;
  alias: string | null;
  profit_share_ratio: string | null;
  deposit_amount: number;
  status: string;
  landlord_business_id: string | null;
}

interface SettlementRow {
  id: string;
  landlord_business_id: string | null;
  period_year: number;
  period_month: number;
  revenue: number;
  landlord_share: number;
  company_share: number;
  payment_status: string;
}

interface LandlordRow {
  id: string;
  name: string;
  business_name: string | null;
}

async function fetchData() {
  try {
    const supabase = await createClient();
    const now = new Date();
    const ym = now.getFullYear() * 100 + (now.getMonth() + 1);
    const [u, s, l] = await Promise.all([
      supabase.from("dm_units").select("*"),
      supabase.from("dm_monthly_settlement").select("*").eq("period_year", now.getFullYear()).eq("period_month", now.getMonth() + 1),
      supabase.from("landlord_business").select("id, name, business_name").eq("is_active", true),
    ]);
    return {
      units: (u.data ?? []) as DmUnitRow[],
      settlements: (s.data ?? []) as SettlementRow[],
      landlords: (l.data ?? []) as LandlordRow[],
      currentYM: ym,
    };
  } catch {
    return { units: [], settlements: [], landlords: [], currentYM: 0 };
  }
}

export default async function DmDashboardPage() {
  const { units, settlements, landlords } = await fetchData();
  const now = new Date();

  const activeUnits = units.filter(u => u.status === "active").length;
  const vacantUnits = units.filter(u => u.status === "vacant").length;
  const totalRevenue = settlements.reduce((s, r) => s + r.revenue, 0);
  const totalLandlordShare = settlements.reduce((s, r) => s + r.landlord_share, 0);
  const totalCompanyShare = settlements.reduce((s, r) => s + r.company_share, 0);
  const pendingCount = settlements.filter(s => s.payment_status === "pending").length;

  const lbMap = new Map(landlords.map(l => [l.id, l]));

  // 비율별 호실 분포
  const ratioStats: Record<string, number> = {};
  units.forEach(u => {
    const key = u.profit_share_ratio ?? "미설정";
    ratioStats[key] = (ratioStats[key] ?? 0) + 1;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            DM 단기임대
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {now.getFullYear()}년 {now.getMonth() + 1}월 · 단기임대 호실 운영 + 수익 분배 정산
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/dm/units"><Home className="h-4 w-4 mr-1.5" /> 호실 목록</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/dm/settlement"><Wallet className="h-4 w-4 mr-1.5" /> 월별 정산</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/dm/units/new"><Plus className="h-4 w-4 mr-1.5" /> 호실 추가</Link>
          </Button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">운영 호실</p>
              <Home className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{activeUnits}<span className="text-sm font-normal text-muted-foreground">호</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">공실 {vacantUnits}호</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">이번달 수익</p>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums text-primary">{Math.floor(totalRevenue / 10000).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">만</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">총 매출</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">임대인 지급액</p>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{Math.floor(totalLandlordShare / 10000).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">만</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">분배 후</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">회사 수익</p>
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{Math.floor(totalCompanyShare / 10000).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">만</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">JNP 몫</p>
          </CardContent>
        </Card>
      </div>

      {/* 미입금 알림 */}
      {pendingCount > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900">{pendingCount}건 임대인 지급 대기 중</p>
              <p className="text-xs text-amber-800">이번달 정산 중 미입금 상태</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/dm/settlement?status=pending">처리하기</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 분배 비율 분포 */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold mb-3 text-sm">분배 비율별 호실</h3>
            {Object.keys(ratioStats).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">아직 등록된 호실 없음</p>
            ) : (
              <div className="space-y-2">
                {PROFIT_SHARE_DEFS.filter(d => ratioStats[d.key]).map(d => (
                  <div key={d.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">{d.label}</Badge>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{d.description}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{ratioStats[d.key]}호</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 임대인별 요약 */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">임대인 (DM 단기임대)</h3>
              <Button asChild size="xs" variant="ghost">
                <Link href="/admin/landlord-business">전체 보기 <ArrowRight className="h-3 w-3 ml-0.5" /></Link>
              </Button>
            </div>
            {landlords.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <p>DB 비어있음. 시드 임대인 {LANDLORD_BUSINESS_SEED.filter(l => l.notes?.includes("DM")).length}명 등록 가능</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {LANDLORD_BUSINESS_SEED.filter(l => l.notes?.includes("DM")).map(l => (
                    <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{l.name}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {landlords.slice(0, 8).map(l => {
                  const lUnits = units.filter(u => u.landlord_business_id === l.id);
                  const lSettle = settlements.filter(s => s.landlord_business_id === l.id);
                  const monthShare = lSettle.reduce((sum, r) => sum + r.landlord_share, 0);
                  return (
                    <div key={l.id} className="rounded border border-border/60 p-2.5">
                      <div className="font-semibold text-sm">{l.name}</div>
                      {l.business_name && <p className="text-[10px] text-muted-foreground">{l.business_name}</p>}
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span>{lUnits.length}호</span>
                        <span className="font-semibold tabular-nums text-primary">{Math.floor(monthShare / 10000).toLocaleString()}만</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 border border-border/60 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> DM 단기임대 운영 안내
        </p>
        <ul className="space-y-0.5 ml-4 list-disc">
          <li>매월 정산 = 수익 - 회사 몫 - (제3자 몫) → 임대인 지급액</li>
          <li>분배 비율 5:5/6:4/7:3/8:2 등 임대인별로 다름</li>
          <li>이월금·누계잔액 자동 추적 → 보증금 예치도 함께</li>
          <li>매월 1일 03:00 자동 정산 보고서 생성 (cron)</li>
        </ul>
      </div>
    </div>
  );
}
