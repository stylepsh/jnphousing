import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "즐겨찾기" };

interface FavRow {
  resource_type: string;
  resource_id: string;
  label: string | null;
  created_at: string;
}

const RESOURCE_LABEL: Record<string, { label: string; basePath: string; color: string }> = {
  property: { label: "건물",     basePath: "/admin/properties", color: "bg-blue-100 text-blue-700" },
  tenant:   { label: "임차인",    basePath: "/admin/tenants",    color: "bg-emerald-100 text-emerald-700" },
  landlord: { label: "임대인",    basePath: "/admin/landlords",  color: "bg-purple-100 text-purple-700" },
  lease:    { label: "계약",      basePath: "/admin/leases",     color: "bg-amber-100 text-amber-700" },
  vacancy:  { label: "공실",      basePath: "/admin/vacancies",  color: "bg-rose-100 text-rose-700" },
  agency:   { label: "부동산",    basePath: "/admin/agencies",   color: "bg-slate-100 text-slate-700" },
};

async function fetchFavorites(): Promise<FavRow[] | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("admin_favorites")
      .select("resource_type, resource_id, label, created_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as FavRow[];
  } catch {
    return [];
  }
}

export default async function AdminFavoritesPage() {
  const favs = await fetchFavorites();
  if (favs === null) redirect("/admin/login");

  const grouped = favs.reduce<Record<string, FavRow[]>>((acc, f) => {
    (acc[f.resource_type] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
          즐겨찾기
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">자주 찾는 건물·임차인·계약을 빠르게 접근 · 총 {favs.length}개</p>
      </div>

      {favs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">아직 즐겨찾기한 항목이 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">
              각 페이지 우상단의 ☆ 버튼으로 즐겨찾기에 추가하세요. (마이그레이션 007 실행 후)
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => {
            const meta = RESOURCE_LABEL[type] ?? RESOURCE_LABEL.property;
            return (
              <section key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`text-[10px] ${meta.color} border-0`}>{meta.label}</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}개</span>
                </div>
                <Card>
                  <CardContent className="p-0 divide-y divide-border">
                    {items.map(f => (
                      <Link
                        key={`${f.resource_type}-${f.resource_id}`}
                        href={`${meta.basePath}/${f.resource_id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{f.label ?? meta.label}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{f.resource_id.slice(0, 8)}...</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{f.created_at.slice(0, 10)}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
