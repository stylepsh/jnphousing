/**
 * 건물 시설관리 업체 카테고리 + 카테고리별 메타데이터 (P32).
 *
 * 박성혁 엑셀 분석 기반 6종 카테고리 + 박성혁이 자주 쓰는 업체명·요금대 가이드.
 */

export type VendorCategory =
  | "internet"
  | "cleaning"
  | "electric"
  | "water"
  | "fire"
  | "elevator"
  | "etc";

export interface VendorCategoryMeta {
  key: VendorCategory;
  label: string;
  iconKey: string;      // lib/icons 매핑
  colorClass: string;   // bg + text + border
  knownVendors?: string[];        // 자주 쓰는 업체명 (자동완성용)
  typicalFeeRange?: string;       // 일반적 월 비용대
  paymentCycleHint?: string;
  notes?: string;
}

export const VENDOR_CATEGORIES: VendorCategoryMeta[] = [
  {
    key: "internet",
    label: "인터넷",
    iconKey: "energy",
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
    knownVendors: ["SK브로드밴드", "스카이라이프", "LG유플러스", "kt", "sk"],
    typicalFeeRange: "월 18~25만원",
    paymentCycleHint: "자동이체 (말일/매월 15일)",
    notes: "고객번호·납부번호 별도 관리. 약정 만료일 추적 필요.",
  },
  {
    key: "cleaning",
    label: "청소",
    iconKey: "sparkles",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    knownVendors: ["한빛크린", "부부청소", "향기로운계단", "독립청소"],
    typicalFeeRange: "월 12~80만원 (건물 규모별)",
    paymentCycleHint: "매월 정액",
    notes: "부가세 포함 여부 확인. 쓰레기 봉투 별도 비용 가능.",
  },
  {
    key: "electric",
    label: "전기 (안전관리)",
    iconKey: "alert",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
    knownVendors: ["우리전기"],
    typicalFeeRange: "월 22만원 (월 2회 점검)",
    paymentCycleHint: "매월 15일 청구",
    notes: "전기 안전관리자 선임 의무. 전기 고객번호 별도.",
  },
  {
    key: "water",
    label: "수도",
    iconKey: "energy",
    colorClass: "bg-sky-50 text-sky-700 border-sky-200",
    knownVendors: ["서울시 상수도", "중부수도사업소"],
    typicalFeeRange: "사용량 기반",
    paymentCycleHint: "2개월 단위",
    notes: "수도 고객번호 + 사업자명 일치 필수.",
  },
  {
    key: "fire",
    label: "소방",
    iconKey: "alert",
    colorClass: "bg-red-50 text-red-700 border-red-200",
    knownVendors: ["독도이엔씨", "대영하이택"],
    typicalFeeRange: "분기 20~30만원",
    paymentCycleHint: "분기·반기",
    notes: "소방시설 정기점검 의무. 계약 필요.",
  },
  {
    key: "elevator",
    label: "승강기",
    iconKey: "energy",
    colorClass: "bg-purple-50 text-purple-700 border-purple-200",
    knownVendors: ["㈜태산엘리베이터", "티케이엘베", "㈜씨와이엘리베이터", "한길승강기"],
    typicalFeeRange: "월 15~30만원",
    paymentCycleHint: "매월",
    notes: "24/7 출동 연락처 확보. 안전관리대행 의무.",
  },
  {
    key: "etc",
    label: "기타",
    iconKey: "more",
    colorClass: "bg-slate-50 text-slate-600 border-slate-200",
    notes: "주차·CCTV·도배·보일러·정수기 등",
  },
];

export function getCategoryMeta(key: string): VendorCategoryMeta {
  return VENDOR_CATEGORIES.find(c => c.key === key) ?? VENDOR_CATEGORIES[VENDOR_CATEGORIES.length - 1];
}
