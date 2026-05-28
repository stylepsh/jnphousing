import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BannerForm } from "./_components/banner-form";

export const metadata: Metadata = { title: "팝업 배너" };
export const dynamic = "force-dynamic";

export default async function BannerAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_popup_banner")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          팝업 배너
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          홈페이지 진입 시 뜨는 팝업을 켜고/끄고 내용을 편집합니다. 방문자는 &ldquo;오늘 하루 안 보기&rdquo;로 닫을 수 있습니다.
        </p>
      </div>

      {data === null && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">마이그레이션 009 실행 필요</p>
          <p className="text-xs">
            Supabase SQL Editor 에서 <code>009_popup_banner.sql</code> 실행 후 사용 가능합니다.
            (테이블이 없으면 저장이 안 됩니다)
          </p>
        </div>
      )}

      <BannerForm initial={data ?? undefined} />
    </div>
  );
}
