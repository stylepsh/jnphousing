/**
 * JSON-LD 구조화 데이터.
 * Server Component 에서 사용. dangerouslySetInnerHTML 은 정적 JSON.stringify 결과만 사용 (사용자 입력 X).
 */

import { COMPANY } from "@/lib/company";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    description: `${COMPANY.serviceArea} 부동산 관리 전문기업`,
    url: PUBLIC_SITE_URL,
    telephone: COMPANY.contact.phone,
    email: COMPANY.contact.email,
    address: COMPANY.branches.map((b) => ({
      "@type": "PostalAddress",
      streetAddress: b.address,
      addressCountry: "KR",
      name: `${b.label} (${b.detail})`,
    })),
    areaServed: COMPANY.serviceArea.split(" · "),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": PUBLIC_SITE_URL + "/#business",
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    description: "HUG 대위변제·부실 건물·세입자 분쟁까지 축적된 현장 노하우로 해결하는 위탁임대 전문기업",
    url: PUBLIC_SITE_URL,
    telephone: COMPANY.contact.phone,
    email: COMPANY.contact.email,
    image: PUBLIC_SITE_URL + "/og-default.png",
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
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "14:00",
      },
    ],
    sameAs: [],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const base = PUBLIC_SITE_URL;
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${base}${item.url}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function FAQPageJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function ArticleJsonLd({
  title,
  description,
  datePublished,
  dateModified,
  imageUrl,
  authorName,
}: {
  title: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  imageUrl?: string;
  authorName?: string;
}) {
  const base = PUBLIC_SITE_URL;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: imageUrl,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Organization",
      name: authorName ?? COMPANY.brand,
    },
    publisher: {
      "@type": "Organization",
      name: COMPANY.brand,
      logo: {
        "@type": "ImageObject",
        url: `${base}/favicon.svg`,
      },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function PropertyJsonLd({
  name,
  address,
  units,
  type,
}: {
  name: string;
  address: string;
  units: number;
  type: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name,
    description: `${name} (총 ${units}세대) - ${COMPANY.brand} 관리`,
    address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "KR" },
    accommodationCategory: type,
    numberOfRooms: units,
    provider: {
      "@type": "RealEstateAgent",
      name: COMPANY.brand,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
