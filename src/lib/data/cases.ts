/**
 * 고객 사례·성공 사례 (P21-19).
 * BLOCKERS B-102 임시 가명 더미 — 실제 사례 수집 시 교체.
 */

export interface CaseStudy {
  id: string;
  category: "hug" | "vacancy" | "dispute" | "match" | "ops";
  categoryLabel: string;
  badge: string;
  badgeColor: string;          // Tailwind class
  clientAlias: string;         // 가명 (이니셜·간단 형태)
  buildingType: string;        // 건물 유형
  location: string;            // 지역
  problem: string;             // 문제 한 줄
  result: string;              // 결과 한 줄
  durationMonths: number;
  metric: { label: string; value: string };  // 핵심 수치
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "case-001",
    category: "hug",
    categoryLabel: "HUG 대위변제 대응",
    badge: "긴급",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    clientAlias: "김OO 임대인",
    buildingType: "빌라 (12세대)",
    location: "서울 양천",
    problem: "전세보증사고 후 임차인 5명 동시 퇴거 위기, 보증보험 대위변제 발생",
    result: "법무·중재 동행으로 임차인 정리 + 후속 임대 정상화, 6개월 내 90% 재계약",
    durationMonths: 6,
    metric: { label: "재계약률", value: "90%" },
  },
  {
    id: "case-002",
    category: "vacancy",
    categoryLabel: "부실 건물 정상화",
    badge: "정상화",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    clientAlias: "박OO 임대인",
    buildingType: "오피스텔 (84세대)",
    location: "부천 중동",
    problem: "공실률 40% · 누수·수선 미진행 · 임대료 회수율 60%",
    result: "단계적 수선 + 채널 4사 동시 광고로 공실률 12%까지 감축",
    durationMonths: 4,
    metric: { label: "공실률", value: "40% → 12%" },
  },
  {
    id: "case-003",
    category: "dispute",
    categoryLabel: "세입자 분쟁 중재",
    badge: "중재",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    clientAlias: "이OO 임대인",
    buildingType: "아파트 (1세대 갈등)",
    location: "인천 부평",
    problem: "임차인 장기연체 + 명도 거부 + 시설훼손 주장 상호 분쟁",
    result: "변호사 협력 + 현장 중재로 합의 명도 + 잔여 채권 분할 회수",
    durationMonths: 3,
    metric: { label: "합의 회수율", value: "78%" },
  },
  {
    id: "case-004",
    category: "match",
    categoryLabel: "임차인 매칭 가속",
    badge: "스피드",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    clientAlias: "최OO 임대인",
    buildingType: "오피스텔 (96세대 신축)",
    location: "부천 상동",
    problem: "신축 입주 시즌 놓침 — 1.5개월간 임대료 0원 지속",
    result: "피터팬·삼삼엠투·직방 통합 광고 + 부동산 회원망 활용, 3주 내 80% 충원",
    durationMonths: 1,
    metric: { label: "3주 점유율", value: "80%" },
  },
  {
    id: "case-005",
    category: "ops",
    categoryLabel: "위탁 운영 효율화",
    badge: "프로세스",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    clientAlias: "정OO 임대인",
    buildingType: "복수 건물 (3개동 134세대)",
    location: "경기·서울 분산",
    problem: "직접 운영 부담 — 임대료 수금·민원·정산을 임대인 본인이 처리",
    result: "위탁관리 전환 후 자동 수금·월 정산 보고서·민원 단일창구로 통합",
    durationMonths: 2,
    metric: { label: "운영시간", value: "주 18h → 2h" },
  },
];
