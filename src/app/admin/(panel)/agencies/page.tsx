import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgencyActions } from "./agency-actions";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Agency } from "@/types/database";

async function fetchAgencies(): Promise<Agency[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as Agency[];
}

export default async function AgenciesPage() {
  const all = await fetchAgencies();
  const pending = all.filter((a) => a.status === "pending");
  const approved = all.filter((a) => a.status === "approved");
  const rejected = all.filter((a) => a.status === "rejected");

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">부동산 회원</h1>
        <p className="mt-1 text-sm text-muted-foreground">가입 신청을 검토하고 승인·거절을 처리하세요.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">승인 대기 ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">승인됨 ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">거절됨 ({rejected.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <AgencyTable agencies={pending} showActions />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <AgencyTable agencies={approved} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <AgencyTable agencies={rejected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgencyTable({ agencies, showActions }: { agencies: Agency[]; showActions?: boolean }) {
  if (agencies.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground text-sm">
          해당 상태의 회원이 없습니다.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {agencies.map((a) => (
        <Card key={a.id}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="font-bold truncate">{a.company_name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  대표: {a.representative} · 사업자 {formatBizNo(a.business_number)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">
                {format(new Date(a.created_at), "MM.dd", { locale: ko })}
              </p>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">📞 {a.phone}</p>
              {a.address && <p className="text-muted-foreground truncate">📍 {a.address}</p>}
            </div>
            {a.reject_reason && (
              <div className="mt-3 rounded bg-red-50 border border-red-100 p-2 text-xs text-red-800">
                <span className="font-semibold">거절 사유: </span>{a.reject_reason}
              </div>
            )}
            {showActions && (
              <div className="mt-4 pt-3 border-t border-border">
                <AgencyActions agencyId={a.id} companyName={a.company_name} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatBizNo(s: string): string {
  if (s.length === 10) return `${s.slice(0, 3)}-${s.slice(3, 5)}-${s.slice(5)}`;
  return s;
}
