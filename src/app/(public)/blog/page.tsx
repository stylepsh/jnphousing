import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Clock, ArrowRight, Tag as TagIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/data/blog-posts";

export const metadata: Metadata = {
  title: "블로그 - 위탁임대 가이드·사례 분석",
  description: "HUG 대위변제·전세사기·공실 관리 등 부동산 위탁임대 전문 콘텐츠.",
  openGraph: {
    title: "JNP 블로그",
    description: "위탁임대 전문 노하우의 전문 가이드와 사례 분석",
    images: [`/api/og?title=${encodeURIComponent("블로그")}&subtitle=${encodeURIComponent("위탁임대 가이드·사례 분석")}`],
  },
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <>
      <section className="bg-primary text-white py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(49,130,246,0.25),transparent_60%)] animate-gradient" />
        <div className="relative mx-auto max-w-5xl px-6">
          <Breadcrumbs items={[{ name: "블로그" }]} className="text-white/70 mb-5" />
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5" /> Blog
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            위탁임대 가이드 · 사례
          </h1>
          <p className="mt-3 text-blue-100 max-w-2xl">
            HUG 대위변제·전세사기·공실 관리·임차인 분쟁 — JNP 운영 노하우를 글로 정리합니다.
          </p>
        </div>
      </section>

      <main id="main-content" className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-2 mb-8">
            <Link href="/blog" className="px-3 py-1.5 text-sm rounded-full bg-primary text-white font-medium">
              전체
            </Link>
            {BLOG_CATEGORIES.map(c => (
              <Link key={c.slug} href={`/blog/category/${c.slug}`} className="px-3 py-1.5 text-sm rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                {c.label}
              </Link>
            ))}
          </div>

          {/* 글 목록 */}
          <div className="space-y-4 stagger-children">
            {BLOG_POSTS.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="block animate-fade-in">
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <CardContent className="p-0">
                    <div className="grid sm:grid-cols-[1fr_auto] gap-0">
                      <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-[10px]">{p.categoryLabel}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {p.publishedAt}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {p.readingTimeMin}분
                          </span>
                        </div>
                        <h2 className="text-lg md:text-xl font-bold tracking-tight mb-2">{p.title}</h2>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.excerpt}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.tags.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-flex items-center gap-0.5">
                              <TagIcon className="h-2.5 w-2.5" /> {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="hidden sm:block w-32 h-full" style={{ background: `linear-gradient(135deg, hsl(${p.coverHue}, 60%, 35%) 0%, hsl(${p.coverHue}, 50%, 22%) 100%)` }} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-lg bg-slate-50 border border-border/60 p-5 text-center text-sm text-muted-foreground">
            <p>더 많은 콘텐츠가 곧 추가됩니다. 카카오톡 채널로 신규 글 알림 받기 →</p>
          </div>
        </div>
      </main>
    </>
  );
}
