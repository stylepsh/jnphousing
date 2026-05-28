/**
 * 제이앤피 주택관리 회사 정보 — 한 곳에서 관리.
 * 사업자등록증 (2026-05-08 발급) 기준.
 */

export const COMPANY = {
  legalName: "제이앤피 주택관리",
  brand: "JNP주택관리",
  representative: "박재흥",

  yearsOfExperience: 27,
  serviceArea: "경기 · 서울 · 인천",

  /** @deprecated lib/constants/stats.ts (COMPANY_STATS) 사용. */
  stats: {
    operatedBuildings: 32,
    managedUnits: 480,
    resolvedDisputes: 67,
    yearsAsTeam: 27,
  },

  business: {
    category: "부동산업",
    item: "부동산 관리업",
    summary: "주택 위탁임대관리 · 주택관리 · 부동산 관리 전문",
    items: [
      "주택 위탁임대관리 (HUG 대위변제·부실 건물·분쟁 사건 포함)",
      "주택관리 (오피스텔·아파트·빌라·상가)",
      "부동산 분양 · 판매",
      "임대 관련 법무·실무 조언",
    ],
  },

  branches: [
    {
      label: "본점",
      address: "경기도 부천시 원미구 장말로216번길 3",
      detail: "푸르지오상가동 202-S8호 (중동, 팰리스카운티)",
    },
  ],

  contact: {
    phone: "010-7508-6916",
    phoneHref: "tel:01075086916",
    phoneLabel: "신규 위탁운영 관리 문의",
    email: "info@jnphousing.com",
    kakaoOpenChat: "https://open.kakao.com/o/scZWs5vi",
  },

  legal: {
    registrationNumber: "361-27-02026",
    openDate: "2022",
  },
} as const;
