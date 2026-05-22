import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, MapPin, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/company";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Property, Vacancy } from "@/types/database";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  available: { label: "공실", color: "bg-green-100 text-green-800 border-green-200" },
  reserved: { label: "예약중", color: "bg-amber-100 text-amber-800 border-amber-200" },
  contracted: { label: "계약완료", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

function formatMoney(v: number): string {
  if (v === 0) return "0";
  if (v >= 100000000) return `${Math.floor(v / 100000000)}억${v % 100000000 ? ` ${Math.floor((v % 100000000) / 10000)}만` : ""}원`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("vacancies").select("*").eq("id", id).maybeSingle();
  const v = data as Vacancy | null;
  if (!v) return { title: "매물 상세" };
  return { title: `${v.unit_number}호 매물 상세` };
}

export default async function VacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vData } = await supabase
    .from("vacancies")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  const vacancy = vData as Vacancy | null;
  if (!vacancy) notFound();

  const { data: pData } = await supabase
    .from("properties")
    .select("*")
    .eq("id", vacancy.property_id)
    .maybeSingle();
  const property = pData as Property | null;

  const cfg = STATUS_LABEL[vacancy.status] ?? STATUS_LABEL.available;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/agency/vacancies">
          <ArrowLeft className="h-4 w-4 mr-1" /> 매물 목록
        </Link>
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 이미지 갤러리 */}
        <div className="lg:col-span-2">
          <div className="aspect-[4/3] rounded-xl bg-muted overflow-hidden">
            {vacancy.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vacancy.images[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="h-24 w-24 text-muted-foreground/20" />
              </div>
            )}
          </div>
          {vacancy.images && vacancy.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {vacancy.images.slice(1).map((src, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="space-y-4">
          <div>
            <Badge className={`${cfg.color} hover:${cfg.color} mb-3`}>{cfg.label}</Badge>
            <h1 className="text-2xl font-bold tracking-tight">
              {property?.name} · {vacancy.unit_number}호
            </h1>
            {property && (
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {property.address}
              </p>
            )}
          </div>

          <Card>
            <CardContent className="pt-5 pb-5 space-y-3 text-sm">
              <Row label="보증금" value={formatMoney(vacancy.deposit)} />
              <Row label="월세" value={formatMoney(vacancy.monthly_rent)} highlight />
              <Row label="관리비" value={formatMoney(vacancy.maintenance_fee)} />
              {vacancy.move_in_date && (
                <Row label="입주가능일" value={format(new Date(vacancy.move_in_date), "yyyy.MM.dd", { locale: ko })} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-5 space-y-3 text-sm">
              {vacancy.area_pyeong && <Row label="면적" value={`${vacancy.area_pyeong}평 (${vacancy.area_m2}m²)`} />}
              {vacancy.floor != null && <Row label="층" value={`${vacancy.floor}층`} />}
              {vacancy.room_count != null && <Row label="방" value={`${vacancy.room_count}개`} />}
              {vacancy.bathroom_count != null && <Row label="욕실" value={`${vacancy.bathroom_count}개`} />}
            </CardContent>
          </Card>

          {/* 문의 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm font-semibold mb-3">매물 문의</p>
              <div className="space-y-2">
                <Button asChild className="w-full" variant="default">
                  <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" /> 카카오톡 채팅
                  </a>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <a href={COMPANY.contact.phoneHref}>
                    <Phone className="h-4 w-4 mr-2" /> 전화 문의
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {vacancy.description && (
        <div className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold tracking-tight mb-4">매물 설명</h2>
          <p className="text-base text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {vacancy.description}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-bold text-primary text-base" : "font-semibold"}>{value}</span>
    </div>
  );
}
