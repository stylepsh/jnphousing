import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Building2, Phone, Mail, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "../vacancies/logout-button";

export const metadata: Metadata = { title: "마이페이지" };

interface Agency {
  id: string;
  company_name: string;
  business_number: string;
  ceo_name: string;
  phone: string;
  email: string | null;
  address: string;
  status: string;
  created_at: string;
}

export default async function AgencyMePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agency/me");

  const { data } = await supabase
    .from("agencies")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const agency = data as Agency | null;
  if (!agency) redirect("/login?error=unauthorized");
  if (agency.status !== "approved") redirect(agency.status === "rejected" ? "/agency/rejected" : "/agency/pending");

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">승인 회원</Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{agency.company_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            가입일 {new Date(agency.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <LogoutButton />
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">계정 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="대표자" value={agency.ceo_name} />
          <Row label="사업자번호" value={agency.business_number} />
          <Row label="전화" value={agency.phone} icon={Phone} />
          <Row label="이메일" value={agency.email ?? user.email ?? "-"} icon={Mail} />
          <Row label="주소" value={agency.address} icon={MapPin} />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">정보 수정·비밀번호 변경</p>
          <p>현재는 관리자에게 요청해 주세요 ({process.env.NODE_ENV === "production" ? "010-7508-6916" : "데모"}).</p>
          <p className="mt-1 text-xs">셀프 서비스 변경 기능은 곧 제공됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="w-24 text-muted-foreground text-xs flex items-center gap-1.5 pt-0.5">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className="flex-1 font-medium">{value || "-"}</div>
    </div>
  );
}
