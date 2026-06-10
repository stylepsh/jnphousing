import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Home, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PropertyJsonLd } from "@/components/shared/JsonLd";
import type { Property } from "@/types/database";

const TYPE_KO: Record<string, string> = { officetel: "오피스텔", apartment: "아파트", villa: "빌라", commercial: "상가" };

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "상가",
};

async function fetchProperty(id: string): Promise<Property | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    return (data as Property | null) ?? null;
  } catch {
    return null;
  }
}

async function fetchVacancyCount(propertyId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("vacancies")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("is_published", true)
      .eq("status", "available");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchProperty(id);
  if (!p) return { title: "관리현장" };
  return {
    title: p.name,
    description: `${p.name} - ${p.address} 총 ${p.total_units}세대`,
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await fetchProperty(id);
  if (!property) notFound();

  const vacancyCount = await fetchVacancyCount(property.id);

  return (
    <>
      <PropertyJsonLd
        name={property.name}
        address={property.address}
        units={property.total_units}
        type={TYPE_KO[property.type] ?? property.type}
      />
      {/* 헤더 이미지 */}
      <section className="relative bg-muted">
        <div className="aspect-[21/9] md:aspect-[3/1] w-full bg-muted overflow-hidden">
          {property.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.thumbnail_url}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="h-24 w-24 text-muted-foreground/20" />
            </div>
          )}
        </div>
      </section>

      <section className="bg-background py-12">
        <div className="mx-auto max-w-5xl px-6">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
            <Link href="/properties">
              <ArrowLeft className="h-4 w-4 mr-1" /> 관리현장 목록
            </Link>
          </Button>

          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            {PROPERTY_TYPE_LABEL[property.type] ?? property.type}
          </Badge>
          <h1 className="heading-section">{property.name}</h1>
          <p className="mt-3 text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {property.address}
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">총 세대수</p>
                    <p className="font-bold text-lg">{property.total_units}세대</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">건물 유형</p>
                    <p className="font-bold text-lg">{PROPERTY_TYPE_LABEL[property.type] ?? property.type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">현재 공실</p>
                    <p className="font-bold text-lg">{vacancyCount}건</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {property.description && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight mb-4">건물 소개</h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {property.description}
                </p>
              </div>
            </div>
          )}

          <Card className="mt-12 bg-primary/5 border-primary/20">
            <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">이 건물 입주민이신가요?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  민원 접수, 공지사항, 서류 다운로드를 입주민 페이지에서 확인하세요.
                </p>
              </div>
              <Button asChild>
                <Link href={`/tenant?b=${property.id}`}>입주민 페이지로</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
