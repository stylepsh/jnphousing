import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Building2, MapPin, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Icons } from "@/lib/icons";
import { VENDOR_CATEGORIES, getCategoryMeta, type VendorCategory } from "@/lib/data/vendor-categories";

export const metadata: Metadata = { title: "건물 시설관리" };
export const dynamic = "force-dynamic";

interface VendorRow {
  id: string;
  category: string;
  vendor_name: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  customer_number: string | null;
  account_bank: string | null;
  account_holder: string | null;
  monthly_fee: number | null;
  billing_cycle: string | null;
  customer_center_phone: string | null;
  contract_url: string | null;
  notes: string | null;
  is_active: boolean;
}

interface PropertyDetail {
  id: string;
  name: string;
  short_alias: string | null;
  business_name: string | null;
  business_number: string | null;
  corporate_number: string | null;
  address: string | null;
  entrance_password: string | null;
  management_account: string | null;
  service_modes: string[] | null;
  landlord_business_id: string | null;
  total_units: number;
}

async function fetchData(id: string) {
  try {
    const supabase = await createClient();
    const [pRes, vRes, lbRes, adRes] = await Promise.all([
      supabase.from("properties").select("*").eq("id", id).maybeSingle(),
      supabase.from("building_vendors").select("*").eq("property_id", id).eq("is_active", true).order("category"),
      supabase.from("landlord_business").select("id, name, business_name, phone, email"),
      supabase.from("auto_debit_accounts").select("*").eq("property_id", id).eq("status", "active"),
    ]);
    return {
      property: pRes.data as PropertyDetail | null,
      vendors: (vRes.data ?? []) as VendorRow[],
      landlordMap: new Map(((lbRes.data ?? []) as { id: string; name: string; business_name: string | null; phone: string | null; email: string | null }[]).map(l => [l.id, l])),
      autoDebit: (adRes.data ?? []) as { id: string; purpose: string; bank_name: string | null; account_holder: string | null; monthly_amount: number | null; withdrawal_day: number | null }[],
    };
  } catch {
    return { property: null, vendors: [], landlordMap: new Map(), autoDebit: [] };
  }
}

export default async function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { property: p, vendors, landlordMap, autoDebit } = await fetchData(id);
  if (!p) notFound();

  const landlord = p.landlord_business_id ? landlordMap.get(p.landlord_business_id) : null;

  // 카테고리별 그룹
  const byCategory = vendors.reduce<Record<string, VendorRow[]>>((acc, v) => {
    (acc[v.category] ||= []).push(v);
    return acc;
  }, {});

  const totalMonthly = vendors.reduce((s, v) => s + (v.monthly_fee ?? 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <Link href="/admin/buildings-managed" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> 위탁관리 건물 목록
      </Link>

      {/* Header */}
      <Card className="mb-6 bg-gradient-to-br from-primary to-slate-800 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {(p.service_modes ?? []).map(m => (
                  <Badge key={m} variant="outline" className="bg-white/15 text-white border-white/30 text-[10px]">
                    {m === "dm" ? "DM 단기임대" : m === "housing_mgmt" ? "건물 위탁관리" : "임대 위탁"}
                  </Badge>
                ))}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{p.short_alias ?? p.name}</h1>
              {p.business_name && <p className="text-sm text-blue-100 mt-1">{p.business_name}</p>}
              {p.address && (
                <p className="text-xs text-blue-200 mt-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {p.address}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 건물 기본 정보 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">사업자등록번호</p>
            <p className="mt-1 font-semibold tabular-nums">{p.business_number ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">고유번호증</p>
            <p className="mt-1 font-semibold tabular-nums">{p.corporate_number ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">총 세대</p>
            <p className="mt-1 font-semibold">{p.total_units}호</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">시설 월 비용</p>
            <p className="mt-1 font-semibold text-primary tabular-nums">{Math.floor(totalMonthly / 10000).toLocaleString()}만원</p>
          </CardContent>
        </Card>
      </div>

      {/* 임사자 + 운영 정보 */}
      {(landlord || p.entrance_password || p.management_account) && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3">📋 운영 정보</p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {landlord && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">임사자</span><span className="font-semibold">{landlord.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">사업자명</span><span>{landlord.business_name ?? "-"}</span></div>
                  {landlord.phone && <div className="flex justify-between"><span className="text-muted-foreground">연락처</span><a href={`tel:${landlord.phone}`} className="text-primary">{landlord.phone}</a></div>}
                  {landlord.email && <div className="flex justify-between"><span className="text-muted-foreground">이메일</span><span className="text-xs">{landlord.email}</span></div>}
                </>
              )}
              {p.management_account && (
                <div className="flex justify-between"><span className="text-muted-foreground">관리단 계좌</span><span className="font-mono text-xs">{p.management_account}</span></div>
              )}
              {p.entrance_password && (
                <div className="flex justify-between"><span className="text-muted-foreground">공동현관</span><span className="font-mono">****</span></div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 시설관리 6종 */}
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Icons.tools className="h-5 w-5 text-primary" /> 시설관리 업체
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {VENDOR_CATEGORIES.filter(c => c.key !== "etc").map(cat => {
          const Icon = Icons[cat.iconKey as keyof typeof Icons] ?? Icons.tools;
          const items = byCategory[cat.key] ?? [];
          return (
            <Card key={cat.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${cat.colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{cat.label}</h3>
                    <p className="text-[10px] text-muted-foreground">{items.length > 0 ? `${items.length}개 업체` : "미등록"}</p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-3 text-xs text-muted-foreground">
                    <p>가이드: {cat.typicalFeeRange ?? "-"}</p>
                    {cat.knownVendors && (
                      <p className="mt-1 text-[10px] opacity-70">예: {cat.knownVendors.slice(0, 2).join(", ")}</p>
                    )}
                    <Button asChild size="xs" variant="outline" className="mt-2">
                      <Link href={`/admin/buildings-managed/${p.id}/vendors/new?category=${cat.key}`}>
                        <Plus className="h-3 w-3 mr-0.5" /> 추가
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map(v => (
                      <div key={v.id} className="rounded border border-border/60 p-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-semibold">{v.vendor_name}</div>
                          {v.monthly_fee && <span className="tabular-nums text-primary">{Math.floor(v.monthly_fee / 10000)}만</span>}
                        </div>
                        {v.contact_person && (
                          <p className="text-[11px] text-muted-foreground">{v.contact_person}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {v.contact_phone && (
                            <a href={`tel:${v.contact_phone}`} className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline">
                              <Phone className="h-2.5 w-2.5" /> {v.contact_phone}
                            </a>
                          )}
                          {v.contact_email && (
                            <a href={`mailto:${v.contact_email}`} className="text-[10px] text-muted-foreground hover:text-foreground">
                              <Mail className="h-2.5 w-2.5" />
                            </a>
                          )}
                          {v.contract_url && (
                            <a href={v.contract_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                              <FileText className="h-2.5 w-2.5" /> 계약서
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 자동이체 계좌 */}
      {autoDebit.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Icons.payment className="h-5 w-5 text-primary" /> 자동이체 계좌
            </h3>
            <div className="space-y-2">
              {autoDebit.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded border border-border/60 p-3 text-sm">
                  <div>
                    <div className="font-semibold">{a.purpose}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.bank_name ?? "-"} · {a.account_holder ?? "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    {a.monthly_amount && <div className="font-semibold tabular-nums">{a.monthly_amount.toLocaleString()}원</div>}
                    {a.withdrawal_day && <div className="text-[10px] text-muted-foreground">매월 {a.withdrawal_day}일</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
