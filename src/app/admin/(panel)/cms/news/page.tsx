import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewsDialog } from "./news-dialog";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Pin, ExternalLink } from "lucide-react";
import Link from "next/link";

interface NewsPost {
  id: string;
  title: string;
  slug: string | null;
  category: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  view_count: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  general:   "일반",
  press:     "보도",
  update:    "업데이트",
  holiday:   "휴무",
  important: "중요",
};

async function fetchNewsPosts(): Promise<NewsPost[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notices_board")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []) as NewsPost[];
  } catch {
    return [];
  }
}

export default async function AdminCmsNewsPage() {
  const posts = await fetchNewsPosts();
  const publishedCount = posts.filter(p => p.is_published).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">공지 게시판 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            홈페이지 <Link href="/news" target="_blank" className="underline">/news</Link> 에 노출되는 회사 공식 공지사항입니다.
            총 {posts.length}개 · 발행 {publishedCount}개
          </p>
        </div>
        <NewsDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground mb-2">아직 등록된 글이 없습니다.</p>
              <p className="text-xs text-muted-foreground">
                &ldquo;새 글 작성&rdquo; 버튼으로 첫 글을 등록하세요.
                <br />
                ⚠️ 데이터베이스 마이그레이션 006_content_cms.sql 실행이 필요합니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">상태</TableHead>
                  <TableHead className="w-[90px]">카테고리</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[80px]">조회</TableHead>
                  <TableHead className="w-[100px]">발행일</TableHead>
                  <TableHead className="text-right w-[140px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {n.is_pinned && <Pin className="h-3 w-3 text-amber-600" />}
                        {n.is_published ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            발행
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">임시</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{CATEGORY_LABEL[n.category] ?? n.category}</TableCell>
                    <TableCell>
                      <div className="font-medium line-clamp-1">{n.title}</div>
                      {n.excerpt && <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.excerpt}</div>}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{n.view_count}</TableCell>
                    <TableCell className="text-xs">
                      {n.published_at
                        ? format(new Date(n.published_at), "MM.dd", { locale: ko })
                        : format(new Date(n.created_at), "MM.dd", { locale: ko }) + " (임시)"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {n.is_published && (
                          <Link
                            href={`/news/${n.slug ?? n.id}`}
                            target="_blank"
                            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                            title="공개 페이지 보기"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <NewsDialog mode="edit" post={n} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900">
        <p className="font-semibold mb-1">💡 작성 팁</p>
        <ul className="space-y-0.5 ml-4 list-disc">
          <li><b>임시저장</b>: 발행 체크 해제 → 외부 노출 없이 저장만 됨. 부담 없이 작성하세요.</li>
          <li><b>고정 공지</b>: 가장 위에 항상 표시됩니다. 휴무·중요 공지에 활용.</li>
          <li><b>요약</b>: 비우면 본문이 자동으로 일부 보여집니다.</li>
          <li><b>URL slug</b>: 비우면 제목 기반으로 자동 생성. SEO 향상에 도움.</li>
        </ul>
      </div>
    </div>
  );
}
