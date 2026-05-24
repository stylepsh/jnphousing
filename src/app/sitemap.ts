import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnphousing.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,           lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/about`,      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services`,   lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/properties`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/contact`,    lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/tenant`,     lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/agency/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
