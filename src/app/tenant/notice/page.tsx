import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Pin, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Notice } from "@/types/database";

export const metadata: Metadata = {
  title: "공지사항",
};

async function fetchNotices(propertyId?: string): Promise<Notice[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("notices")
      .select("*")
      .eq("is_published", true);

    if (propertyId) {
      query = query.or(`property_id.eq.${propertyId},property_id.is.null`);
    }

    const { data } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    return (data ?? []) as Notice[];
  } catch {
    return [];
  }
}

export default async function NoticePage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const { b } = await searchParams;
  const notices = await fetchNotices(b);
  const pinned = notices.filter((n) => n.is_pinned);
  const regular = notices.filter((n) => !n.is_pinned);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/tenant${b ? `?b=${b}` : ""}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 입주민 메인
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">공지사항</h1>
        <p className="mt-2 text-muted-foreground">입주민께 안내드리는 사항입니다.</p>
      </div>

      {notices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>아직 공지사항이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pinned.map((n) => (
            <NoticeCard key={n.id} notice={n} />
          ))}
          {pinned.length > 0 && regular.length > 0 && (
            <div className="my-4 h-px bg-border" />
          )}
          {regular.map((n) => (
            <NoticeCard key={n.id} notice={n} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <Card className={notice.is_pinned ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            {notice.is_pinned && (
              <Badge variant="secondary" className="bg-primary text-white hover:bg-primary/90">
                <Pin className="h-3 w-3 mr-1" /> 고정
              </Badge>
            )}
            <h3 className="font-bold text-base">{notice.title}</h3>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(notice.created_at), "yyyy.MM.dd", { locale: ko })}
          </span>
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {notice.content}
        </p>
      </CardContent>
    </Card>
  );
}
