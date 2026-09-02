import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";
import { fetchPublicPropertyGroups } from "@/lib/public-properties-server";

export const metadata: Metadata = {
  title: "관리현장",
  description: "JNP주택관리가 현재 운영 중인 관리 건물 목록입니다.",
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "상가",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const allProperties = await fetchPublicPropertyGroups();
  const query = (sp.q ?? "").trim().toLocaleLowerCase("ko-KR");
  const properties = allProperties.filter((property) => {
    const typeMatches = !sp.type || sp.type === "all" || property.type === sp.type;
    const queryMatches = !query || `${property.name} ${property.address} ${property.region}`.toLocaleLowerCase("ko-KR").includes(query);
    return typeMatches && queryMatches;
  });

  return (
    <>
      <section className="bg-primary text-white py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Properties</p>
          <h1 className="mt-2 heading-section">관리현장</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl">
            현재 JNP주택관리가 운영 중인 건물입니다. 클릭 시 상세 정보를 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-6">
          {/* 필터 */}
          <form className="mb-8 flex flex-wrap gap-2" action="/properties" method="get">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="건물명·지역 검색"
              className="h-10 px-3 rounded-lg border border-border bg-white text-sm flex-1 min-w-[200px] max-w-md"
            />
            {[
              { v: "all", l: "전체" },
              { v: "officetel", l: "오피스텔" },
              { v: "apartment", l: "아파트" },
              { v: "villa", l: "빌라" },
              { v: "commercial", l: "상가" },
            ].map((t) => {
              const params = new URLSearchParams();
              if (sp.q) params.set("q", sp.q);
              if (t.v !== "all") params.set("type", t.v);
              const active = (sp.type ?? "all") === t.v;
              return (
                <a
                  key={t.v}
                  href={`/properties?${params.toString()}`}
                  className={`px-3 h-10 inline-flex items-center rounded-lg border text-sm transition ${
                    active ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {t.l}
                </a>
              );
            })}
            <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-white text-sm">검색</button>
          </form>

          {properties.length === 0 ? (
            <Card className="border-dashed max-w-2xl mx-auto">
              <CardContent className="py-20 text-center text-muted-foreground">
                <Building2 className="h-14 w-14 mx-auto mb-4 opacity-30" />
                <p className="text-base">조건에 맞는 관리현장이 없습니다.</p>
                <p className="text-sm mt-2">다른 건물명이나 지역으로 검색해 보세요.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-8">총 {properties.length}개 관리현장</p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((p) => (
                  <Link key={p.id} href={`/properties/${p.id}`}>
                    <Card className="overflow-hidden border-border/60 hover:shadow-lg transition-all hover:-translate-y-0.5 h-full">
                      <div className="aspect-[16/10] bg-muted relative">
                        <Image
                          src={p.imagePath}
                          alt={`${PROPERTY_TYPE_LABEL[p.type] ?? p.type} 건물 유형 대표 이미지`}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10 text-[11px] font-medium text-white/90">
                          건물 유형 대표 이미지
                        </div>
                        <Badge className="absolute top-3 left-3 bg-white/95 text-primary hover:bg-white">
                          {PROPERTY_TYPE_LABEL[p.type] ?? p.type}
                        </Badge>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 line-clamp-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {p.address}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>총 {p.totalUnits.toLocaleString("ko-KR")}세대</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{p.region}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
