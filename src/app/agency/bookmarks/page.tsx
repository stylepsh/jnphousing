import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { title: "찜한 매물" };

export default function AgencyBookmarksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <Heart className="h-5 w-5 text-rose-600" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">찜한 매물</h1>
        <p className="mt-2 text-muted-foreground text-sm">관심 있는 매물을 모아 빠르게 확인하세요.</p>
      </header>

      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-4">아직 찜한 매물이 없습니다.</p>
          <Button asChild>
            <Link href="/agency/vacancies">공실 매물 보러가기</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
