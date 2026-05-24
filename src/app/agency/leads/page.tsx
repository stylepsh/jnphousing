import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { title: "임차인 연결 신청" };

export default function AgencyLeadsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임차인 연결 신청</h1>
        <p className="mt-2 text-muted-foreground text-sm">매물에 임차인을 연결한 신청 이력입니다.</p>
      </header>

      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Send className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-2">아직 연결 신청이 없습니다.</p>
          <p className="text-xs text-muted-foreground mb-4">
            매물 상세 페이지에서 임차인 정보를 보내 연결 신청할 수 있습니다.
          </p>
          <Button asChild>
            <Link href="/agency/vacancies">매물 보러가기</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
