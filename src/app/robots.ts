import type { MetadataRoute } from "next";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

const BASE = PUBLIC_SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/agency/vacancies", "/auth"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
