import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "승인 대기 중",
};

export default function PendingPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">승인 대기 중</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            가입 신청이 접수되었습니다.
            <br />
            관리자가 사업자 정보를 확인한 후 승인합니다.
            <br />
            영업일 기준 1~2일 내에 처리됩니다.
          </p>
          <div className="mt-8 space-y-2">
            <Button asChild className="w-full" variant="outline">
              <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2" /> 카카오톡으로 문의
              </a>
            </Button>
            <Button asChild className="w-full" variant="ghost">
              <Link href="/">홈으로</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
