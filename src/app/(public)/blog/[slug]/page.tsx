import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Tag as TagIcon, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BLOG_POSTS, getBlogPost } from "@/lib/data/blog-posts";
import { buildArticleLd, jsonLdSafeStringify } from "@/lib/seo/jsonld";
import { COMPANY } from "@/lib/company";

export async function generateStaticParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getBlogPost(slug);
  if (!p) return { title: "블로그" };
  const ogParams = new URLSearchParams({ title: p.title, subtitle: p.excerpt.slice(0, 80), category: p.categoryLabel });
  return {
    title: p.title,
    description: p.excerpt,
    openGraph: {
      title: p.title,
      description: p.excerpt,
      type: "article",
      publishedTime: p.publishedAt,
      authors: [p.author],
      tags: p.tags,
      images: [`/api/og?${ogParams.toString()}`],
    },
    alternates: { canonical: `/blog/${p.slug}` },
  };
}

/** 매우 단순한 markdown 렌더링 (## h2, ### h3, **bold**, --- hr, list, paragraph) */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/^---$/gm, '<hr class="my-8 border-border" />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80">$1</a>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-foreground text-sm">$1</code>');

  // Lists
  html = html.replace(/(^- .+$\n?)+/gm, (m) => {
    const items = m.trim().split("\n").map(l => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `<ul class="list-disc pl-6 space-y-1 my-4">${items}</ul>`;
  });

  // Tables (very simple)
  html = html.replace(/^\| (.+) \|$/gm, (m) => {
    if (m.includes("---")) return ""; // separator
    const cells = m.replace(/^\| |\ \|$/g, "").split(" | ");
    const tag = cells.length > 0 && cells[0].length < 30 ? "td" : "td";
    return `<tr>${cells.map(c => `<${tag} class="border border-border px-3 py-1.5 text-sm">${c}</${tag}>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>.+<\/tr>\n?)+/g, (m) => `<table class="border-collapse my-6 w-full">${m}</table>`);

  // Paragraphs
  html = html
    .split("\n\n")
    .map(block => {
      if (/^<(h\d|ul|hr|table|pre)/.test(block.trim())) return block;
      if (!block.trim()) return "";
      return `<p class="my-4 leading-relaxed text-foreground/85">${block.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html;
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getBlogPost(slug);
  if (!p) notFound();

  const related = BLOG_POSTS.filter(x => x.slug !== p.slug && x.category === p.category).slice(0, 2);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdSafeStringify(buildArticleLd({
            title: p.title,
            description: p.excerpt,
            datePublished: p.publishedAt,
            authorName: p.author,
            url: `/blog/${p.slug}`,
          })),
        }}
      />

      {/* Cover */}
      <section
        className="relative text-white py-16 md:py-20 overflow-hidden"
        style={{ background: `linear-gradient(135deg, hsl(${p.coverHue}, 55%, 28%) 0%, hsl(${p.coverHue}, 45%, 16%) 100%)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-6">
          <Breadcrumbs
            items={[{ name: "블로그", href: "/blog" }, { name: p.title }]}
            className="text-white/70 mb-5"
          />
          <Badge className="bg-white/15 text-white border-white/20 mb-3">{p.categoryLabel}</Badge>
          <h1 className="font-bold tracking-tight leading-tight" style={{ fontSize: "clamp(24px, 5vw, 40px)" }}>
            {p.title}
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/85">{p.excerpt}</p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.publishedAt}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.readingTimeMin}분 읽기</span>
            <span>by {p.author}</span>
          </div>
        </div>
      </section>

      <main id="main-content" className="bg-background py-12 md:py-16">
        <article className="mx-auto max-w-3xl px-6">
          <div
            className="prose-jnp"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(p.content) }}
          />

          <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-1.5">
            {p.tags.map(t => (
              <Link key={t} href={`/blog/tag/${t}`} className="text-xs px-2 py-1 rounded bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5">
                <TagIcon className="h-3 w-3" /> {t}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 rounded-2xl bg-primary text-white p-6 md:p-8 text-center">
            <h3 className="text-xl font-bold mb-2">상황 상담은 무료입니다</h3>
            <p className="text-white/80 text-sm mb-5">
              비슷한 사례 + 다음 단계 시나리오를 알려드립니다.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button asChild size="sm" className="bg-white text-primary hover:bg-blue-50">
                <a href={COMPANY.contact.phoneHref}><Phone className="h-3.5 w-3.5 mr-1" /> {COMPANY.contact.phone}</a>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-3.5 w-3.5 mr-1" /> 카카오 채팅</a>
              </Button>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-bold mb-4">관련 글</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {related.map(r => (
                  <Link key={r.slug} href={`/blog/${r.slug}`}>
                    <Card className="hover:shadow-md transition-shadow h-full">
                      <CardContent className="p-4">
                        <Badge variant="outline" className="text-[10px] mb-2">{r.categoryLabel}</Badge>
                        <h4 className="text-sm font-bold mb-1 line-clamp-2">{r.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.excerpt}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 text-center">
            <Button asChild variant="outline">
              <Link href="/blog"><ArrowLeft className="h-4 w-4 mr-1" /> 블로그 목록</Link>
            </Button>
          </div>
        </article>
      </main>
    </>
  );
}
