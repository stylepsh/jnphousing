/**
 * 임차인·임대인 후기 더미 (P23-37).
 * BLOCKERS B-102 — 실제 후기 수집 시 교체.
 */

export interface Review {
  id: string;
  authorAlias: string;          // 가명
  authorRole: "tenant" | "landlord" | "agency";
  authorRoleLabel: string;
  buildingHint?: string;        // 익명화된 건물 힌트
  rating: number;               // 1-5
  title: string;
  body: string;
  isVerified: boolean;
  createdAt: string;
}

export const REVIEWS: Review[] = [
  {
    id: "rv-001",
    authorAlias: "박OO 임대인",
    authorRole: "landlord",
    authorRoleLabel: "임대인",
    buildingHint: "부천 중동 오피스텔",
    rating: 5,
    title: "공실률 40% → 12%, 위탁이 답이었습니다",
    body: "직접 운영할 때는 채널 광고도 한 곳만 쓰고, 시설 수선 우선순위도 몰랐습니다. JNP 위탁 후 4개월 만에 공실률이 절반 이하로 떨어졌습니다. 월 정산서를 받아보는 게 이렇게 마음 편한 일인 줄 몰랐어요.",
    isVerified: true,
    createdAt: "2026-04-12",
  },
  {
    id: "rv-002",
    authorAlias: "김OO 임차인",
    authorRole: "tenant",
    authorRoleLabel: "임차인",
    rating: 5,
    title: "도배 누수 새벽 2시 신고 → 다음날 아침 처리",
    body: "온라인으로 민원 접수하니 새벽인데도 1시간 안에 답이 왔어요. 다음날 아침에 시설 담당자가 직접 와서 누수 부분 수선 완료. 임대인 직접 연락이 어색하던 차에 단일 창구가 너무 편합니다.",
    isVerified: true,
    createdAt: "2026-04-05",
  },
  {
    id: "rv-003",
    authorAlias: "최OO 부동산",
    authorRole: "agency",
    authorRoleLabel: "부동산 회원",
    rating: 5,
    title: "공실 정보 실시간, 임차인 연결 신청 후 빠른 회신",
    body: "JNP 의 공실 매물 페이지가 항상 최신 상태라 헛걸음이 없습니다. 임차인 연결 신청도 평일 기준 1시간 내 회신. 부동산 입장에서 가장 신뢰할 수 있는 위탁사 중 하나입니다.",
    isVerified: true,
    createdAt: "2026-03-28",
  },
  {
    id: "rv-004",
    authorAlias: "이OO 임대인",
    authorRole: "landlord",
    authorRoleLabel: "임대인",
    buildingHint: "서울 양천 빌라",
    rating: 5,
    title: "HUG 대위변제 후 망연자실 → 6개월 만에 정상화",
    body: "보증사고로 임차인 5명이 동시에 빠지고 막막했는데, 박재흥 대표님께서 직접 법무·중재 동행해 주셨습니다. 6개월 만에 빌라 90% 재계약. 이런 사례를 다른 임대인 분들도 알았으면 합니다.",
    isVerified: true,
    createdAt: "2026-03-15",
  },
  {
    id: "rv-005",
    authorAlias: "정OO 임대인",
    authorRole: "landlord",
    authorRoleLabel: "임대인",
    buildingHint: "복수 건물 134세대",
    rating: 5,
    title: "주 18시간 → 2시간. 시간이 가장 큰 절약입니다",
    body: "3개 건물 직접 운영하느라 본업이 안 됐는데, 위탁 후 운영 시간이 거의 사라졌습니다. 단순 시간 절약을 넘어 마음의 부담이 사라졌어요. 27년 노하우는 진짜입니다.",
    isVerified: true,
    createdAt: "2026-02-22",
  },
];

export function averageRating(): number {
  if (REVIEWS.length === 0) return 0;
  return REVIEWS.reduce((sum, r) => sum + r.rating, 0) / REVIEWS.length;
}
