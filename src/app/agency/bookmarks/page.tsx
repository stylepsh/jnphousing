import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Home as HomeIcon, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "찜한 매물" };

interface BookmarkRow {
  vacancy_id: string;
  created_at: string;
  note: string | null;
}

interface VacancyMini {
  id: string;
  title: string;
  property_id: string | null;
  deposit: number;
  monthly_rent: number;
  unit_no: string | null;
  status: string;
}

async function fetchData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: agency } = await supabase.from("agencies").select("id, status, company_name").eq("user_id", user.id).maybeSingle();
    const a = agency as { id: string; status: string; company_name: string } | null;
    if (!a) return null;

    const { data: bms } = await supabase.from("agency_bookmarks").select("vacancy_id, created_at, note").eq("agency_id", a.id).order("created_at", { ascending: false });
    const bookmarks = (bms ?? []) as BookmarkRow[];
    if (bookmarks.length === 0) return { agency: a, bookmarks: [], vacancies: [] };

    const ids = bookmarks.map(b => b.vacancy_id);
    const { data: vs } = await supabase.from("vacancies").select("id, title, property_id, deposit, monthly_rent, unit_no, status").in("id", ids);
    const vacancies = (vs ?? []) as VacancyMini[];
    return { agency: a, bookmarks, vacancies };
  } catch (e) {
    console.warn("[bookmarks fetch]", e);
    return null;
  }
}

function fmtMan(v: number): string {
  if (!v) return "-";
  return Math.floor(v / 10_000).toLocaleString() + "만";
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  available:  { label: "공실",     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  reserved:   { label: "예약중",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  contracted: { label: "계약완료", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default async function AgencyBookmarksPage() {
  const data = await fetchData();
  if (!data) redirect("/login?next=/agency/bookmarks");

  const { agency, bookmarks, vacancies } = data;
  if (agency.status !== "approved") redirect(agency.status === "rejected" ? "/agency/rejected" : "/agency/pending");

  const vacancyMap = new Map(vacancies.map(v => [v.id, v]));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <Heart className="h-5 w-5 text-rose-600" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">찜한 매물</h1>
        <p className="mt-2 text-muted-foreground text-sm">총 {bookmarks.length}개 · 관심 있는 매물을 모아 빠르게 확인하세요.</p>
      </header>

      {bookmarks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-4">아직 찜한 매물이 없습니다.</p>
            <Button asChild>
              <Link href="/agency/vacancies"><HomeIcon className="h-4 w-4 mr-1.5" /> 공실 매물 보러가기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {bookmarks.map(b => {
            const v = vacancyMap.get(b.vacancy_id);
            if (!v) return null;
            const status = STATUS_LABEL[v.status] ?? STATUS_LABEL.available;
            return (
              <Card key={b.vacancy_id} className="animate-fade-in hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                    <span className="text-[10px] text-muted-foreground">{b.created_at.slice(0, 10)} 찜</span>
                  </div>
                  <h3 className="font-bold mb-1 line-clamp-1">{v.title}</h3>
                  {v.unit_no && <p className="text-xs text-muted-foreground mb-2">호실 {v.unit_no}</p>}
                  <div className="text-xs space-y-0.5 mb-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">보증금</span><span className="font-semibold">{fmtMan(v.deposit)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">월세</span><span className="font-semibold">{fmtMan(v.monthly_rent)}</span></div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/agency/vacancies/${v.id}`}>매물 상세 <ExternalLink className="h-3 w-3 ml-1" /></Link>
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
