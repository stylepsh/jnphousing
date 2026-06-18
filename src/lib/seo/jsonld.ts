/**
 * JSON-LD 빌더 (P24-45).
 *
 * 페이지에서 빌더 호출 → 객체 → <Script id="ld-..." type="application/ld+json"> 출력.
 * 모든 JSON-LD 의 단일 진실 원천.
 */

import { COMPANY } from "@/lib/company";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnphousing.co.kr";

export function buildOrganizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${BASE}/#org`,
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    description: `${COMPANY.serviceArea} 부동산 위탁임대 전문기업`,
    url: BASE,
    telephone: COMPANY.contact.phone,
    email: COMPANY.contact.email,
    image: `${BASE}/api/og`,
    logo: `${BASE}/favicon.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.branches[0].address,
      addressLocality: "부천시",
      addressRegion: "경기도",
      addressCountry: "KR",
    },
    areaServed: COMPANY.serviceArea.split(" · "),
    knowsAbout: ["HUG 대위변제", "전세사기 대응", "위탁임대관리", "주택관리", "임차인 분쟁 중재"],
  };
}

export function buildLocalBusinessLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE}/#business`,
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    description: `HUG 대위변제·부실 건물·세입자 분쟁까지 축적된 현장 노하우로 해결하는 위탁임대 전문기업`,
    url: BASE,
    telephone: COMPANY.contact.phone,
    email: COMPANY.contact.email,
    image: `${BASE}/api/og`,
    priceRange: "₩₩",
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.branches[0].address,
      addressLocality: "부천시",
      addressRegion: "경기도",
      postalCode: "14627",
      addressCountry: "KR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 37.504,
      longitude: 126.766,
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "09:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "10:00", closes: "14:00" },
    ],
  };
}

export function buildBreadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE}${item.url}`,
    })),
  };
}

export function buildFaqPageLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(q => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function buildArticleLd(args: {
  title: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  imageUrl?: string;
  authorName?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.title,
    description: args.description,
    image: args.imageUrl ?? `${BASE}/api/og`,
    datePublished: args.datePublished,
    dateModified: args.dateModified ?? args.datePublished,
    author: { "@type": "Organization", name: args.authorName ?? COMPANY.brand },
    publisher: {
      "@type": "Organization",
      name: COMPANY.brand,
      logo: { "@type": "ImageObject", url: `${BASE}/favicon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": args.url.startsWith("http") ? args.url : `${BASE}${args.url}` },
  };
}

export function buildResidenceLd(args: {
  name: string;
  address: string;
  units: number;
  type: string;
  url?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: args.name,
    description: `${args.name} (총 ${args.units}세대) - ${COMPANY.brand} 관리`,
    address: { "@type": "PostalAddress", streetAddress: args.address, addressCountry: "KR" },
    accommodationCategory: args.type,
    numberOfRooms: args.units,
    provider: { "@type": "RealEstateAgent", name: COMPANY.brand, "@id": `${BASE}/#org` },
    ...(args.url ? { url: args.url.startsWith("http") ? args.url : `${BASE}${args.url}` } : {}),
  };
}

/**
 * 안전한 JSON 직렬화 (XSS 방지) — < 를 < 로 이스케이프.
 */
export function jsonLdSafeStringify(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
