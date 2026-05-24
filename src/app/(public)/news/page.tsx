import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar, Pin, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "공지사항",
  description: "JNP주택관리 공지사항·뉴스·소식",
};

interface Notice {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_pinned: boolean;
  published_at: string | null;
  created_at: string;
  view_count: number;
}

const CATEGORY_LABEL: Record<string, { label: string; className: string }> = {
  general:   { label: "일반",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  press:     { label: "보도",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  update:    { label: "업데이트", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  holiday:   { label: "휴무",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  important: { label: "중요",   className: "bg-red-100 text-red-700 border-red-200" },
};

async function fetchNotices(): Promise<Notice[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notices_board")
      .select("id, title, slug, category, excerpt, cover_image_url, is_pinned, published_at, created_at, view_count")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return [];
    return (data ?? []) as Notice[];
  } catch {
    return [];
  }
}

export default async function NewsPage() {
  const notices = await fetchNotices();

  return (
    <>
      <section className="bg-gradient-to-br from-primary via-primary to-slate-800 text-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
            <Megaphone className="h-3.5 w-3.5" /> 공지사항
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            JNP주택관리 소식
          </h1>
          <p className="mt-3 text-blue-100">
            업무 공지·시스템 업데이트·휴무·언론 보도 등 회사의 최신 소식을 전해드립니다.
          </p>
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-6">
          {notices.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-20 text-center">
                <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">아직 등록된 공지사항이 없습니다.</p>
                <p className="text-xs text-muted-foreground mt-1">곧 다양한 소식으로 찾아뵙겠습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => {
                const cat = CATEGORY_LABEL[n.category] ?? CATEGORY_LABEL.general;
                const dateStr = (n.published_at ?? n.created_at).slice(0, 10).replace(/-/g, ".");
                const href = `/news/${n.slug ?? n.id}`;
                return (
                  <li key={n.id}>
                    <Link href={href} className="block">
                      <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-start gap-4">
                            {n.cover_image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={n.cover_image_url}
                                alt={n.title}
                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                {n.is_pinned && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    <Pin className="h-3 w-3 mr-1" /> 고정
                                  </Badge>
                                )}
                                <Badge variant="outline" className={cat.className}>
                                  {cat.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {dateStr}
                                </span>
                              </div>
                              <h2 className="text-lg font-bold tracking-tight line-clamp-1">
                                {n.title}
                              </h2>
                              {n.excerpt && (
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                  {n.excerpt}
                                </p>
                              )}
                              <div className="mt-2 text-xs text-primary font-medium flex items-center gap-1 group">
                                자세히 보기 <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
