import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Home, ArrowLeft } from "lucide-react";
import { PropertyJsonLd } from "@/components/shared/JsonLd";
import { fetchPublicPropertyGroup, fetchPublicVacancyCount } from "@/lib/public-properties-server";

const TYPE_KO: Record<string, string> = { officetel: "오피스텔", apartment: "아파트", villa: "빌라", commercial: "상가" };

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "상가",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchPublicPropertyGroup(id);
  if (!p) return { title: "관리현장" };
  return {
    title: p.name,
    description: `${p.name} - ${p.address} 총 ${p.totalUnits}세대 관리현장`,
    alternates: { canonical: `/properties/${p.id}` },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await fetchPublicPropertyGroup(id);
  if (!property) notFound();

  const vacancyCount = await fetchPublicVacancyCount(property.sourceIds);

  return (
    <>
      <PropertyJsonLd
        name={property.name}
        address={property.address}
        units={property.totalUnits}
        type={TYPE_KO[property.type] ?? property.type}
      />
      {/* 헤더 이미지 */}
      <section className="relative bg-muted">
        <div className="relative aspect-[21/9] md:aspect-[3/1] w-full bg-muted overflow-hidden">
          <Image
            src={property.imagePath}
            alt={`${PROPERTY_TYPE_LABEL[property.type] ?? property.type} 건물 유형 대표 이미지`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
          <p className="absolute bottom-4 right-6 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            건물 유형 대표 이미지
          </p>
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
            <MapPin className="h-4 w-4" aria-hidden="true" /> {property.address}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">관리 지역 · {property.region}</p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">총 세대수</p>
                    <p className="font-bold text-lg">{property.totalUnits.toLocaleString("ko-KR")}세대</p>
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

          <div className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight mb-4">관리현장 소개</h2>
            <p className="max-w-3xl text-base text-foreground/80 leading-relaxed">
              {property.region}에서 JNP주택관리가 운영하는 {PROPERTY_TYPE_LABEL[property.type] ?? property.type} 관리현장입니다.
              입주민 개인정보와 세부 호실 정보는 보호를 위해 공개하지 않습니다.
            </p>
          </div>

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
