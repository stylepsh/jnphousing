/**
 * JNP주택관리 회사 정보 — 한 곳에서 관리.
 */

export const COMPANY = {
  groupName: "제이앤피 그룹",
  parts: ["제이앤피 주택관리", "이한종합건설"] as const,
  brand: "JNP주택관리",

  yearsOfExperience: 27,
  serviceArea: "경기 · 서울 · 인천",

  business: {
    summary: "부동산 관리 / 건축·주택건설 / 부동산 분양·판매",
    items: [
      "부동산 관리업",
      "건축공사 · 주택건설공사",
      "부동산 분양 · 판매",
      "건물건설업",
    ],
  },

  branches: [
    {
      label: "지점 1 (본점)",
      address: "경기도 부천시 원미구 장말로 216번길 3",
      detail: "중동 팰리스카운티",
    },
    {
      label: "지점 2",
      address: "경기도 부천시 원미구 장말로 273, 7층",
      detail: "심곡동 유진빌딩",
    },
  ],

  contact: {
    phone: "0507-1340-XXXX", // TODO: 부장님께 실제 번호 받기
    phoneHref: "tel:050713400000",
    email: "info@jnp-housing.com",
    kakaoOpenChat: "https://open.kakao.com/o/scZWs5vi",
  },

  // 부장님께 받을 정보들
  legal: {
    registrationNumber: "___-__-_____", // 사업자등록번호
  },
} as const;
