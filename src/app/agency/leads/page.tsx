import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "임차인 연결 신청 이력" };

interface LeadRow {
  id: string;
  vacancy_id: string;
  tenant_name: string;
  tenant_phone: string;
  preferred_move_in: string | null;
  status: string;
  admin_memo: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  submitted:  { label: "신청 접수", color: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted:  { label: "연락 진행", color: "bg-amber-100 text-amber-700 border-amber-200" },
  contracted: { label: "계약 완료", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected:   { label: "거절",     color: "bg-red-100 text-red-700 border-red-200" },
  withdrawn:  { label: "철회",     color: "bg-slate-100 text-slate-600 border-slate-200" },
};

async function fetchLeads(): Promise<LeadRow[] | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: agency } = await supabase.from("agencies").select("id, status").eq("user_id", user.id).maybeSingle();
    const a = agency as { id: string; status: string } | null;
    if (!a) return null;
    if (a.status !== "approved") return [];
    const { data } = await supabase.from("agency_lead_requests").select("*").eq("agency_id", a.id).order("created_at", { ascending: false }).limit(50);
    return (data ?? []) as LeadRow[];
  } catch {
    return [];
  }
}

export default async function AgencyLeadsPage() {
  const leads = await fetchLeads();
  if (leads === null) redirect("/login?next=/agency/leads");

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임차인 연결 신청</h1>
        <p className="mt-2 text-muted-foreground text-sm">매물 상세 페이지에서 신청한 임차인 연결 이력입니다 · 총 {leads.length}건</p>
      </header>

      {leads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Send className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-1">아직 연결 신청이 없습니다.</p>
            <p className="text-xs text-muted-foreground mb-4">매물 상세 페이지의 &ldquo;임차인 연결 신청&rdquo; 버튼으로 시작하세요.</p>
            <Button asChild>
              <Link href="/agency/vacancies">매물 보러가기 <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map(l => {
            const st = STATUS_LABEL[l.status] ?? STATUS_LABEL.submitted;
            return (
              <Card key={l.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                      <span className="font-semibold">{l.tenant_name}</span>
                      <span className="text-xs text-muted-foreground">{l.tenant_phone}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{l.created_at.slice(0, 10)}</span>
                  </div>
                  {l.preferred_move_in && (
                    <p className="text-xs text-muted-foreground mb-1">희망 입주일: {l.preferred_move_in}</p>
                  )}
                  {l.admin_memo && (
                    <div className="mt-2 rounded bg-slate-50 border border-border/60 p-2 text-xs text-muted-foreground">
                      <strong className="text-foreground">관리자 메모:</strong> {l.admin_memo}
                    </div>
                  )}
                  <Button asChild size="sm" variant="ghost" className="mt-2">
                    <Link href={`/agency/vacancies/${l.vacancy_id}`}>해당 매물 보기</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
