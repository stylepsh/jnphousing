import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "가입 거절",
};

async function getRejectReason(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("agencies")
      .select("reject_reason")
      .eq("user_id", user.id)
      .maybeSingle();
    return ((data as { reject_reason: string | null } | null)?.reject_reason) ?? null;
  } catch {
    return null;
  }
}

export default async function RejectedPage() {
  const reason = await getRejectReason();

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">가입이 거절되었습니다</h1>
          <p className="mt-3 text-muted-foreground">
            아래 사유로 가입 신청이 거절되었습니다.
          </p>
          {reason && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-4 text-left">
              <p className="text-xs font-semibold text-red-700 mb-1">거절 사유</p>
              <p className="text-sm text-red-900 whitespace-pre-wrap">{reason}</p>
            </div>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            추가 문의는 카카오톡으로 부탁드립니다.
          </p>
          <div className="mt-6 space-y-2">
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
