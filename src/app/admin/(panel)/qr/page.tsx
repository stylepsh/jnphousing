import { Card, CardContent } from "@/components/ui/card";
import { QrPrintWorkspace } from "./qr-workspace";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/types/database";

async function fetchProperties(): Promise<Pick<Property, "id" | "name" | "address">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name, address")
    .eq("is_published", true)
    .order("name");
  return (data ?? []) as Pick<Property, "id" | "name" | "address">[];
}

export default async function QrPage() {
  const properties = await fetchProperties();

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">QR 코드 생성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          건물별 입주민 페이지 QR을 만들어 인쇄용 PDF로 출력하세요.
        </p>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            먼저 관리현장을 등록해 주세요.
          </CardContent>
        </Card>
      ) : (
        <QrPrintWorkspace properties={properties} />
      )}
    </div>
  );
}
