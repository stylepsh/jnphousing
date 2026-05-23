import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Megaphone, FileDown, ChevronRight, Phone, Search, KeyRound, FileSignature, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantSession } from "@/lib/tenant-session";

export const metadata: Metadata = {
  title: "입주민 서비스",
  description: "민원 접수, 공지 확인, 서류 다운로드 — 입주민 전용 서비스",
};

async function fetchPropertyName(propertyId: string | undefined): Promise<string | null> {
  if (!propertyId) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("name")
      .eq("id", propertyId)
      .maybeSingle();
    return ((data as { name: string } | null)?.name) ?? null;
  } catch {
    return null;
  }
}

export default async function TenantHome({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const { b } = await searchParams;
  const buildingName = await fetchPropertyName(b);
  const buildingSuffix = b ? `?b=${b}` : "";
  const session = await getTenantSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        {buildingName && (
          <p className="text-sm text-primary font-semibold mb-2">{buildingName}</p>
        )}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          무엇을 도와드릴까요?
        </h1>
        <p className="mt-3 text-muted-foreground">
          아래 카드를 눌러 원하시는 서비스를 선택하세요.
        </p>
      </div>

      {/* 본인 인증 카드 */}
      {session ? (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Link href="/tenant/my-lease" className="block">
            <Card className="hover:shadow-lg transition-all bg-primary text-white">
              <CardContent className="py-5 px-5 flex items-center gap-3">
                <FileSignature className="h-6 w-6 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">내 계약</h3>
                  <p className="text-xs opacity-80 mt-0.5">보증금·월세 확인</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tenant/my-rent" className="block">
            <Card className="hover:shadow-lg transition-all bg-primary text-white">
              <CardContent className="py-5 px-5 flex items-center gap-3">
                <Receipt className="h-6 w-6 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">청구·납부</h3>
                  <p className="text-xs opacity-80 mt-0.5">미납 잔액·이자</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      ) : (
        <Link href="/tenant/login" className="block mb-4">
          <Card className="hover:shadow-lg hover:border-primary/30 transition-all border-2 border-dashed">
            <CardContent className="py-5 px-5 flex items-center gap-3">
              <KeyRound className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-sm">본인 인증</h3>
                <p className="text-xs text-muted-foreground mt-0.5">계약·청구 내역을 확인하려면 인증</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="space-y-3">
        <Link href={`/tenant/complaint${buildingSuffix}`} className="block">
          <Card className="hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="py-6 flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <MessageCircle className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">민원/AS 접수</h2>
                <p className="text-sm text-muted-foreground mt-0.5">전화 없이 간편 온라인 접수</p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/tenant/notice" className="block">
          <Card className="hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="py-6 flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Megaphone className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">공지사항</h2>
                <p className="text-sm text-muted-foreground mt-0.5">입주민 안내사항을 확인하세요</p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/tenant/downloads" className="block">
          <Card className="hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="py-6 flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <FileDown className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">서류 다운로드</h2>
                <p className="text-sm text-muted-foreground mt-0.5">계약서, 안내문, 서식</p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/tenant/complaint/lookup" className="block">
          <Card className="hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="py-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Search className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold">내 민원 조회</h2>
                <p className="text-xs text-muted-foreground mt-0.5">접수번호로 처리 상태 확인</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-10 p-5 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">긴급 상황 발생 시</p>
            <p className="text-sm text-amber-800 mt-1">
              누수·정전·화재 등 긴급 상황은 관리실로 바로 연락 주세요.
            </p>
            <a href="tel:010-0000-0000" className="inline-block mt-2 font-bold text-amber-900 underline">
              010-XXXX-XXXX
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
