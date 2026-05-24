import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Pin, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Notice {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_pinned: boolean;
  is_published: boolean;
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

async function fetchNotice(slugOrId: string): Promise<Notice | null> {
  try {
    const supabase = await createClient();
    // slug 우선, 없으면 id 로 시도
    const { data: bySlug } = await supabase
      .from("notices_board")
      .select("*")
      .eq("slug", slugOrId)
      .eq("is_published", true)
      .maybeSingle();
    if (bySlug) return bySlug as Notice;

    const { data: byId } = await supabase
      .from("notices_board")
      .select("*")
      .eq("id", slugOrId)
      .eq("is_published", true)
      .maybeSingle();
    return (byId ?? null) as Notice | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const notice = await fetchNotice(slug);
  if (!notice) return { title: "공지사항" };
  return {
    title: notice.title,
    description: notice.excerpt ?? notice.title,
    openGraph: {
      title: notice.title,
      description: notice.excerpt ?? undefined,
      images: notice.cover_image_url ? [notice.cover_image_url] : undefined,
    },
  };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const n = await fetchNotice(slug);
  if (!n) notFound();

  const cat = CATEGORY_LABEL[n.category] ?? CATEGORY_LABEL.general;
  const dateStr = (n.published_at ?? n.created_at).slice(0, 10).replace(/-/g, ".");

  return (
    <article className="mx-auto max-w-3xl px-6 py-10 md:py-16">
      <Link href="/news" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 공지사항 목록
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {n.is_pinned && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Pin className="h-3 w-3 mr-1" /> 고정
            </Badge>
          )}
          <Badge variant="outline" className={cat.className}>{cat.label}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {dateStr}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
          {n.title}
        </h1>
        {n.excerpt && (
          <p className="mt-3 text-base text-muted-foreground">{n.excerpt}</p>
        )}
      </header>

      {n.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.cover_image_url}
          alt={n.title}
          className="w-full aspect-[16/9] object-cover rounded-2xl mb-8"
        />
      )}

      <div className="prose prose-slate max-w-none whitespace-pre-wrap text-base leading-relaxed">
        {n.content}
      </div>

      <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/news">
            <ArrowLeft className="h-4 w-4 mr-1" /> 목록으로
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Megaphone className="h-3 w-3" /> JNP주택관리
        </div>
      </div>
    </article>
  );
}
