import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

export const metadata: Metadata = { title: "활동 내역" };

export default function AgencyActivityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">활동 내역</h1>
        <p className="mt-2 text-muted-foreground text-sm">매물 조회·찜·연결 신청 등 모든 활동 기록입니다.</p>
      </header>

      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">아직 기록된 활동이 없습니다.</p>
          <p className="text-xs text-muted-foreground mt-1">
            매물을 둘러보고 찜하시면 여기에 기록됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
