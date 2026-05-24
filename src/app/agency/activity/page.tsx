import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Eye, Heart, X, Send, Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "활동 내역" };

interface ActivityRow {
  id: number;
  vacancy_id: string | null;
  action: "view" | "bookmark" | "unbookmark" | "inquiry_request" | "contract_request";
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  view:              { label: "매물 조회",         icon: Eye,       color: "text-slate-600 bg-slate-100" },
  bookmark:          { label: "찜 추가",           icon: Heart,     color: "text-rose-600 bg-rose-50" },
  unbookmark:        { label: "찜 해제",           icon: X,         color: "text-slate-500 bg-slate-50" },
  inquiry_request:   { label: "임차인 연결 신청",   icon: Send,      color: "text-blue-600 bg-blue-50" },
  contract_request:  { label: "계약 의뢰",          icon: Handshake, color: "text-emerald-600 bg-emerald-50" },
};

async function fetchActivities(): Promise<ActivityRow[] | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: agency } = await supabase.from("agencies").select("id, status").eq("user_id", user.id).maybeSingle();
    const a = agency as { id: string; status: string } | null;
    if (!a) return null;
    if (a.status !== "approved") return [];
    const { data } = await supabase.from("agency_activity_log").select("*").eq("agency_id", a.id).order("created_at", { ascending: false }).limit(100);
    return (data ?? []) as ActivityRow[];
  } catch {
    return [];
  }
}

export default async function AgencyActivityPage() {
  const acts = await fetchActivities();
  if (acts === null) redirect("/login?next=/agency/activity");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">활동 내역</h1>
        <p className="mt-2 text-muted-foreground text-sm">매물 조회·찜·연결 신청 기록 최근 100건</p>
      </header>

      {acts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">아직 기록된 활동이 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">매물을 둘러보고 찜하시면 여기에 자동으로 기록됩니다.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {acts.map(a => {
              const meta = ACTION_LABEL[a.action] ?? ACTION_LABEL.view;
              const Icon = meta.icon;
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{meta.label}</div>
                    {a.vacancy_id && <div className="text-[11px] text-muted-foreground font-mono truncate">매물 {a.vacancy_id.slice(0, 8)}…</div>}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
