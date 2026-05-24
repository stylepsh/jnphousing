/**
 * JSON-LD 구조화 데이터.
 * Server Component 에서 사용. dangerouslySetInnerHTML 은 정적 JSON.stringify 결과만 사용 (사용자 입력 X).
 */

import { COMPANY } from "@/lib/company";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    description: `${COMPANY.yearsOfExperience}년차 ${COMPANY.serviceArea} 부동산 관리 전문기업`,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnphousing.com",
    telephone: COMPANY.contact.phone,
    email: COMPANY.contact.email,
    address: COMPANY.branches.map((b) => ({
      "@type": "PostalAddress",
      streetAddress: b.address,
      addressCountry: "KR",
      name: `${b.label} (${b.detail})`,
    })),
    areaServed: COMPANY.serviceArea.split(" · "),
    foundingDate: "1999",
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
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
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
