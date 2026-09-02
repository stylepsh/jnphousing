import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { groupPublicProperties, type PublicPropertySource } from "@/lib/public-properties";
import { SERVICE_AREAS } from "@/lib/data/services";
import { BLOG_POSTS } from "@/lib/data/blog-posts";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnphousing.co.kr";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${BASE}/`,           changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE}/about`,      changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services`,   changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/properties`, changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE}/reviews`,    changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/auction`,    changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/faq`,        changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/blog`,       changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE}/certifications`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE}/team`,       changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE}/news`,       changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE}/contact`,    changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/tenant`,     changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE}/agency/signup`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/login`,      changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE}/privacy`,    changeFrequency: "yearly",  priority: 0.2 },
  { url: `${BASE}/terms`,      changeFrequency: "yearly",  priority: 0.2 },
];

interface NoticeRow   { id: string; slug: string | null; updated_at?: string | null; published_at: string | null; created_at: string; }

async function fetchDynamic(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createClient();
    const [{ data: props }, { data: notices }] = await Promise.all([
      supabase.from("properties")
        .select("id,name,address,type,total_units,is_published,display_order,created_at,updated_at,unit_type,parent_building_id,unit_no,ho,short_alias,household_count")
        .eq("is_published", true)
        .limit(1000),
      supabase.from("notices_board")
        .select("id, slug, updated_at, published_at, created_at")
        .eq("is_published", true)
        .limit(500),
    ]);

    const propsUrls: MetadataRoute.Sitemap = groupPublicProperties((props ?? []) as PublicPropertySource[]).map((p) => ({
      url: `${BASE}/properties/${p.id}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const noticesUrls: MetadataRoute.Sitemap = ((notices ?? []) as NoticeRow[]).map((n) => ({
      url: `${BASE}/news/${n.slug ?? n.id}`,
      lastModified: new Date(n.updated_at ?? n.published_at ?? n.created_at),
      changeFrequency: "monthly",
      priority: 0.5,
    }));

    return [...propsUrls, ...noticesUrls];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseRoutes = STATIC_ROUTES.map(r => ({ ...r, lastModified: now }));
  const serviceRoutes: MetadataRoute.Sitemap = SERVICE_AREAS.map((service) => ({
    url: `${BASE}/services/${service.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const dynamic = await fetchDynamic();
  return [...baseRoutes, ...serviceRoutes, ...blogRoutes, ...dynamic];
}
