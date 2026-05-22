import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Building2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { VacancyFilters } from "./vacancy-filters";
import type { Property, Vacancy } from "@/types/database";

export const metadata: Metadata = {
  title: "공실 매물",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  available: { label: "공실", color: "bg-green-100 text-green-800 border-green-200" },
  reserved: { label: "예약중", color: "bg-amber-100 text-amber-800 border-amber-200" },
  contracted: { label: "계약완료", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

function formatMoney(v: number): string {
  if (v === 0) return "-";
  if (v >= 100000000) return `${Math.floor(v / 100000000)}억${v % 100000000 ? ` ${Math.floor((v % 100000000) / 10000)}만` : ""}`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return v.toLocaleString();
}

async function fetchAgency() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("agencies")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data as { company_name: string; status: string } | null;
}

async function fetchData(searchParams: {
  property?: string;
  minDeposit?: string;
  maxDeposit?: string;
  minRent?: string;
  maxRent?: string;
}) {
  const supabase = await createClient();

  const { data: propsData } = await supabase
    .from("properties")
    .select("id, name, address, type")
    .eq("is_published", true)
    .order("name");
  const properties = (propsData ?? []) as Pick<Property, "id" | "name" | "address" | "type">[];

  let q = supabase
    .from("vacancies")
    .select("*")
    .eq("is_published", true)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (searchParams.property && searchParams.property !== "all") {
    q = q.eq("property_id", searchParams.property);
  }
  if (searchParams.minDeposit) q = q.gte("deposit", Number(searchParams.minDeposit) * 10000);
  if (searchParams.maxDeposit) q = q.lte("deposit", Number(searchParams.maxDeposit) * 10000);
  if (searchParams.minRent) q = q.gte("monthly_rent", Number(searchParams.minRent) * 10000);
  if (searchParams.maxRent) q = q.lte("monthly_rent", Number(searchParams.maxRent) * 10000);

  const { data: vacanciesData } = await q;
  const vacancies = (vacanciesData ?? []) as Vacancy[];
  return { properties, vacancies };
}

export default async function VacanciesPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    minDeposit?: string;
    maxDeposit?: string;
    minRent?: string;
    maxRent?: string;
  }>;
}) {
  const sp = await searchParams;
  const agency = await fetchAgency();
  const { properties, vacancies } = await fetchData(sp);

  const propMap = new Map(properties.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">부동산 전용</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-bold tracking-tight">공실 매물 현황</h1>
          {agency && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{agency.company_name}</span> 님 환영합니다.
            </p>
          )}
        </div>
        <LogoutButton />
      </div>

      <VacancyFilters properties={properties} initial={sp} />

      <p className="mt-6 mb-4 text-sm text-muted-foreground">
        총 {vacancies.length}건의 매물
      </p>

      {vacancies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>해당 조건의 매물이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {vacancies.map((v) => {
            const prop = propMap.get(v.property_id);
            const cfg = STATUS_LABEL[v.status] ?? STATUS_LABEL.available;
            return (
              <Link key={v.id} href={`/agency/vacancies/${v.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 h-full">
                  <div className="aspect-[16/10] bg-muted relative">
                    {v.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    <Badge className={`absolute top-3 left-3 ${cfg.color} hover:${cfg.color}`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <CardContent className="pt-5 pb-5 space-y-2">
                    <div>
                      <h3 className="font-bold truncate">{prop?.name ?? "—"} · {v.unit_number}호</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {prop?.address ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      {v.area_pyeong && <span>{v.area_pyeong}평</span>}
                      {v.floor != null && <span>{v.floor}층</span>}
                      {v.room_count != null && <span>방 {v.room_count}</span>}
                    </div>
                    <div className="pt-2 mt-2 border-t border-border text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">보증금</span>
                        <span className="font-semibold">{formatMoney(v.deposit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">월세</span>
                        <span className="font-semibold">{formatMoney(v.monthly_rent)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
