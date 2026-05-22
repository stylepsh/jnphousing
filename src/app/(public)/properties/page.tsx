import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/types/database";

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

async function fetchProperties(): Promise<Property[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    return (data ?? []) as Property[];
  } catch {
    return [];
  }
}

export default async function PropertiesPage() {
  const properties = await fetchProperties();

  return (
    <>
      <section className="bg-primary text-white py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Properties</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">관리현장</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl">
            현재 JNP주택관리가 운영 중인 건물입니다. 클릭 시 상세 정보를 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-6">
          {properties.length === 0 ? (
            <Card className="border-dashed max-w-2xl mx-auto">
              <CardContent className="py-20 text-center text-muted-foreground">
                <Building2 className="h-14 w-14 mx-auto mb-4 opacity-30" />
                <p className="text-base">아직 등록된 관리현장이 없습니다.</p>
                <p className="text-sm mt-2">관리자가 등록을 완료하면 이곳에 표시됩니다.</p>
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
                        {p.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-16 w-16 text-muted-foreground/20" />
                          </div>
                        )}
                        <Badge className="absolute top-3 left-3 bg-white/95 text-primary hover:bg-white">
                          {PROPERTY_TYPE_LABEL[p.type] ?? p.type}
                        </Badge>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        <CardDescription className="line-clamp-1">{p.address}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        총 {p.total_units}세대
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
