import { NextResponse } from "next/server";
import { BLOG_POSTS } from "@/lib/data/blog-posts";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnphousing.co.kr";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function GET() {
  const items = BLOG_POSTS
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${BASE}/blog/${p.slug}</link>
      <guid>${BASE}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
      <category>${escapeXml(p.categoryLabel)}</category>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>JNP주택관리 블로그</title>
    <link>${BASE}/blog</link>
    <description>위탁임대 현장 노하우의 가이드·사례 분석</description>
    <language>ko-kr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
