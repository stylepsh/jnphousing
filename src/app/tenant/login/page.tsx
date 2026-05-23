import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, KeyRound } from "lucide-react";
import { TenantLoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";

interface UnitOption {
  id: string;
  unit_no: string;
  property: { name: string } | null;
}

async function fetchUnits(): Promise<UnitOption[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties_units")
      .select("id, unit_no, property:property_id(name)")
      .order("unit_no");
    return ((data ?? []) as unknown as UnitOption[]);
  } catch {
    return [];
  }
}

export const metadata = {
  title: "입주민 로그인",
};

export default async function TenantLoginPage() {
  const units = await fetchUnits();

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/tenant" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 입주민 메인
      </Link>

      <div className="text-center mb-6">
        <div className="h-12 w-12 mx-auto rounded-xl bg-primary text-white flex items-center justify-center mb-3">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">입주민 인증</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          본인 계약 정보·청구 내역 확인을 위해
          <br />휴대폰 끝 4자리와 호실을 입력해 주세요.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TenantLoginForm units={units} />
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        본 인증은 24시간 유지되며, 보안을 위해 부정확한 시도가 반복되면 일시 차단됩니다.
      </p>
    </div>
  );
}
