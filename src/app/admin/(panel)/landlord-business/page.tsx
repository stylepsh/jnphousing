import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserSquare, Plus, Building2, Phone, Mail, ArrowRight, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LANDLORD_BUSINESS_SEED } from "@/lib/data/landlord-business";

export const metadata: Metadata = { title: "임사자 관리" };
export const dynamic = "force-dynamic";

interface LandlordBizRow {
  id: string;
  name: string;
  business_name: string | null;
  business_number: string | null;
  corporate_number: string | null;
  representative: string | null;
  phone: string | null;
  email: string | null;
  account_bank: string | null;
  account_holder: string | null;
  is_active: boolean;
  memo: string | null;
}

interface SummaryRow {
  landlord_business_id: string;
  landlord_name: string;
  business_name: string | null;
  active_units: number;
  vacant_units: number;
  recent_6mo_landlord_share: number;
  current_accumulated: number;
}

interface PropertyRow {
  id: string;
  name: string;
  short_alias: string | null;
  landlord_business_id: string | null;
}

async function fetchData() {
  try {
    const supabase = await createClient();
    const [lbRes, summaryRes, pRes] = await Promise.all([
      supabase.from("landlord_business").select("*").order("name"),
      supabase.from("v_dm_landlord_summary").select("*"),
      supabase.from("properties").select("id, name, short_alias, landlord_business_id"),
    ]);
    return {
      landlords: (lbRes.data ?? []) as LandlordBizRow[],
      summary: new Map(((summaryRes.data ?? []) as SummaryRow[]).map(s => [s.landlord_business_id, s])),
      properties: (pRes.data ?? []) as PropertyRow[],
    };
  } catch {
    return { landlords: [], summary: new Map(), properties: [] };
  }
}

export default async function LandlordBusinessPage() {
  const { landlords, summary, properties } = await fetchData();
  const showSeed = landlords.length === 0;

  const propsByLandlord = new Map<string, PropertyRow[]>();
  properties.forEach(p => {
    if (!p.landlord_business_id) return;
    const arr = propsByLandlord.get(p.landlord_business_id) ?? [];
    arr.push(p);
    propsByLandlord.set(p.landlord_business_id, arr);
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserSquare className="h-6 w-6 text-primary" />
            임사자 (임대사업자) 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            JNP주택관리가 위탁받은 임대사업자 마스터 ·
            {showSeed
              ? ` 엑셀 시드 ${LANDLORD_BUSINESS_SEED.length}명 (DB 등록 전)`
              : ` 등록 ${landlords.length}명`}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/landlord-business/new"><Plus className="h-4 w-4 mr-1.5" /> 임사자 추가</Link>
        </Button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">💡 카드 클릭 → 편집 페이지로 이동</p>

      {showSeed && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">📦 DB 데이터 비어있음</p>
          <p className="text-xs">
            엑셀에서 추출한 시드 데이터입니다. 마이그레이션 008 실행 + 데이터 import 후 활성화.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {(showSeed ? LANDLORD_BUSINESS_SEED : landlords).map(l => {
          const isSeed = !('business_number' in l);
          const id = l.id;
          const sum = !isSeed ? summary.get(id) : null;
          const props = !isSeed ? (propsByLandlord.get(id) ?? []) : [];

          return (
            <Link
              key={id}
              href={isSeed ? "/admin/landlord-business" : `/admin/landlord-business/${id}/edit`}
              className="block animate-fade-in"
            >
              <Card interactive className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base">{l.name}</h3>
                      {(isSeed ? (l as typeof LANDLORD_BUSINESS_SEED[0]).businessName : l.business_name) && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {isSeed ? (l as typeof LANDLORD_BUSINESS_SEED[0]).businessName : l.business_name}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>

                  {(isSeed ? (l as typeof LANDLORD_BUSINESS_SEED[0]).notes : l.memo) && (
                    <p className="text-[11px] text-muted-foreground italic mb-3 line-clamp-2">
                      {isSeed ? (l as typeof LANDLORD_BUSINESS_SEED[0]).notes : l.memo}
                    </p>
                  )}

                  {!isSeed && (
                    <div className="space-y-1.5 mb-3 text-xs">
                      {l.phone && (
                        <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                          <Phone className="h-3 w-3" /> {l.phone}
                        </a>
                      )}
                      {l.email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {l.email}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1 pt-3 border-t border-border/60 text-[11px]">
                    <div>
                      <div className="text-muted-foreground">건물</div>
                      <div className="font-semibold flex items-center gap-0.5">
                        <Building2 className="h-2.5 w-2.5" />
                        {props.length}개
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">DM 호실</div>
                      <div className="font-semibold">{sum?.active_units ?? 0}호</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">최근 6개월</div>
                      <div className="font-semibold tabular-nums text-primary">
                        {sum?.recent_6mo_landlord_share
                          ? `${Math.floor(sum.recent_6mo_landlord_share / 10000).toLocaleString()}만`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg bg-slate-50 border border-border/60 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">📋 임사자 vs 임대인</p>
        <ul className="space-y-0.5 ml-4 list-disc">
          <li><b>임사자 (임대사업자)</b>: 건물 단위 위탁관리·DM 단기임대를 의뢰한 사업자/법인</li>
          <li><b>임대인 (landlords)</b>: 일반 임대 위탁의 개인 임대인</li>
          <li>같은 사람이 둘 다일 수 있음 (예: 이장미 = 트라움하임 임사자 + 일반 임대인)</li>
        </ul>
      </div>
    </div>
  );
}
