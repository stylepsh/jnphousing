import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnphousing.com";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${BASE}/`,           changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE}/about`,      changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services`,   changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/properties`, changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE}/news`,       changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE}/contact`,    changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/tenant`,     changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE}/agency/signup`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/login`,      changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE}/privacy`,    changeFrequency: "yearly",  priority: 0.2 },
  { url: `${BASE}/terms`,      changeFrequency: "yearly",  priority: 0.2 },
];

interface PropertyRow { id: string; updated_at?: string | null; created_at: string; }
interface NoticeRow   { id: string; slug: string | null; updated_at?: string | null; published_at: string | null; created_at: string; }

async function fetchDynamic(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createClient();
    const [{ data: props }, { data: notices }] = await Promise.all([
      supabase.from("properties")
        .select("id, updated_at, created_at")
        .eq("is_published", true)
        .limit(500),
      supabase.from("notices_board")
        .select("id, slug, updated_at, published_at, created_at")
        .eq("is_published", true)
        .limit(500),
    ]);

    const propsUrls: MetadataRoute.Sitemap = ((props ?? []) as PropertyRow[]).map((p) => ({
      url: `${BASE}/properties/${p.id}`,
      lastModified: new Date(p.updated_at ?? p.created_at),
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
  const dynamic = await fetchDynamic();
  return [...baseRoutes, ...dynamic];
}
