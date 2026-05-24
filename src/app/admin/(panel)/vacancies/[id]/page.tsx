import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ImageIcon, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWonMan } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";
import { ImageUploader } from "./image-uploader";
import { ImageGallery } from "./image-gallery";
import { ChannelListings } from "./channel-listings";
import type { Property, Vacancy } from "@/types/database";

interface VacancyImage {
  id: string;
  vacancy_id: string;
  url: string;
  caption: string | null;
  display_order: number;
}
interface AdChannel { id: string; code: string; name: string }
interface VacancyAdListing {
  id: string;
  vacancy_id: string;
  channel_id: string;
  listing_url: string | null;
  listed_at: string;
  unlisted_at: string | null;
  inquiry_count: number;
  status: string;
  notes: string | null;
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  available: { l: "공실", c: "bg-green-100 text-green-800" },
  reserved: { l: "예약중", c: "bg-amber-100 text-amber-800" },
  contracted: { l: "계약완료", c: "bg-slate-100 text-slate-700" },
};

export const metadata = { title: "공실 매물 상세" };

export default async function VacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [vRes, imgRes, chRes, listingRes] = await Promise.all([
    supabase.from("vacancies").select("*, property:properties(name, address)").eq("id", id).maybeSingle(),
    supabase.from("vacancy_images").select("*").eq("vacancy_id", id).order("display_order"),
    supabase.from("ad_channels").select("id, code, name").eq("is_active", true).order("display_order"),
    supabase.from("vacancy_ad_listings").select("*").eq("vacancy_id", id).order("listed_at", { ascending: false }),
  ]);

  const vacancy = vRes.data as unknown as (Vacancy & {
    property: Pick<Property, "name" | "address"> | null;
  }) | null;
  if (!vacancy) notFound();

  const images = (imgRes.data ?? []) as VacancyImage[];
  const channels = (chRes.data ?? []) as AdChannel[];
  const listings = (listingRes.data ?? []) as VacancyAdListing[];
  const totalInquiries = listings.reduce((s, l) => s + l.inquiry_count, 0);
  const cfg = STATUS_LABEL[vacancy.status] ?? STATUS_LABEL.available;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/vacancies"><ArrowLeft className="h-4 w-4 mr-1" /> 공실 목록</Link>
      </Button>

      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <Badge className={`${cfg.c} hover:${cfg.c} mb-2`}>{cfg.l}</Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {vacancy.property?.name} · {vacancy.unit_number}호
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{vacancy.property?.address}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="text-muted-foreground">보 {formatWonMan(vacancy.deposit)}원</span>
            <span className="text-muted-foreground">월 {formatWonMan(vacancy.monthly_rent)}원</span>
            {vacancy.move_in_date && (
              <span className="text-muted-foreground">입주가능 {formatKoreanDate(vacancy.move_in_date)}</span>
            )}
          </div>
        </div>
      </div>

      {/* 사진 갤러리 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> 매물 사진 ({images.length})
          </CardTitle>
          <ImageUploader vacancyId={vacancy.id} currentCount={images.length} />
        </CardHeader>
        <CardContent>
          <ImageGallery images={images} />
        </CardContent>
      </Card>

      {/* 광고 채널 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> 광고 등록 채널 ({listings.length})
            <span className="text-xs font-normal text-muted-foreground ml-2">누적 문의 {totalInquiries}건</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelListings vacancyId={vacancy.id} channels={channels} listings={listings} />
        </CardContent>
      </Card>
    </div>
  );
}
