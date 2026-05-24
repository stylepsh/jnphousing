import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Supabase 미설정 시 페이지 자리에 표시.
 * - 사용자에게 노출되어도 안전한 안내문 (시크릿 노출 X)
 */
export function NotConfiguredBanner({
  title = "데이터베이스 연결이 아직 설정되지 않았습니다",
  description = "관리자가 Supabase 환경변수(.env.local)를 설정한 뒤 이용 가능합니다.",
}: { title?: string; description?: string }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="h-14 w-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-700" />
          </div>
          <h2 className="text-lg font-bold text-amber-900">{title}</h2>
          <p className="mt-2 text-sm text-amber-800 leading-relaxed">{description}</p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button asChild variant="outline" size="sm">
              <Link href="/">홈으로</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/contact">관리실 문의</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
