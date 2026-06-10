/**
 * 서비스 영역별 상세 데이터 (P22-26).
 * 4개 페이지 (/services/housing, /rental, /hug, /dispute) 의 단일 진실 원천.
 */

export interface ServiceArea {
  slug: "housing" | "rental" | "hug" | "dispute";
  title: string;
  tagline: string;
  category: string;
  hue: number;                        // HSL hue (Hero gradient)
  description: string;                // 1-2 paragraph
  highlights: { icon: string; title: string; desc: string }[];   // 6개
  process: { step: number; title: string; desc: string }[];     // 4-5단계
  pricing: { item: string; price: string; note?: string }[];    // 요금표
  faq: { q: string; a: string }[];                              // FAQ
  casesTags: string[];                // 사례 카테고리 매칭
}

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: "housing",
    title: "주택관리",
    tagline: "건물 시설·청소·보안의 종합 관리",
    category: "Building Management",
    hue: 215,
    description: "JNP는 단순 관리가 아니라, 건물을 자기 자산처럼 운영합니다. 축적된 현장 노하우로 시설·보안·청소 한 곳에서 처리하고, 임대인은 정산서만 받아보시면 됩니다.",
    highlights: [
      { icon: "tools",      title: "시설 점검",   desc: "정기·긴급 점검 일정 자동 관리" },
      { icon: "sparkles",   title: "정기 청소",   desc: "공용부 청소 + 외부 환경 관리" },
      { icon: "secure",     title: "보안 운영",   desc: "CCTV 점검 + 경비 협력업체 일원화" },
      { icon: "repair",     title: "긴급 수선",   desc: "24시간 응급 출동 네트워크" },
      { icon: "checklist",  title: "월 점검 리포트", desc: "임대인용 사진·텍스트 보고서" },
      { icon: "phone",      title: "민원 응대",   desc: "온라인·전화 단일 창구" },
    ],
    process: [
      { step: 1, title: "건물 실사",   desc: "전체 점검 + 우선순위 도출" },
      { step: 2, title: "관리 계약",   desc: "범위·수수료·기간 명문화" },
      { step: 3, title: "운영 시작",   desc: "민원·시설·청소 일괄" },
      { step: 4, title: "월 보고",     desc: "리포트 + 정산서" },
    ],
    pricing: [
      { item: "기본 관리비",       price: "세대당 월 1.5~3만원", note: "건물 규모·관리 범위에 따라" },
      { item: "긴급 수선",         price: "실비 청구",            note: "사전 견적·승인 절차" },
      { item: "외부 청소 용역",     price: "월 정액 협의" },
      { item: "CCTV·소방 점검",   price: "분기별 정액",          note: "협력업체 직계약 가능" },
    ],
    faq: [
      { q: "관리 계약 기간은 얼마인가요?", a: "기본 1년 단위. 양 당사자 협의로 연장." },
      { q: "관리비는 임대인이 내나요?", a: "원칙적으로 임대인 부담. 일부는 임차인 관리비에 포함 가능." },
      { q: "긴급 출동 비용은?", a: "출동·진단까지 무료. 실제 수선 발생 시 사전 견적 후 진행." },
    ],
    casesTags: ["vacancy", "ops"],
  },
  {
    slug: "rental",
    title: "위탁임대관리",
    tagline: "임대인 대신 임차 운영을 책임집니다",
    category: "Rental Management",
    hue: 145,
    description: "임차인 모집·임대료 수금·공실 매칭·민원·정산까지 임대인의 모든 역할을 대행합니다. JNP는 부천 일대에서 가장 신뢰받는 위탁임대 회사 중 하나입니다.",
    highlights: [
      { icon: "user",         title: "임차인 모집",   desc: "피터팬·삼삼엠투·직방 동시 광고" },
      { icon: "rent",         title: "임대료 수금",   desc: "가상계좌 + 자동 매칭" },
      { icon: "expiring",     title: "계약 만료 관리", desc: "60일 전 알림 + 갱신 협의" },
      { icon: "agency",       title: "부동산 네트워크", desc: "공인중개사 회원망 활용" },
      { icon: "receipt",      title: "월 정산 보고서", desc: "PDF 자동 생성·이메일 발송" },
      { icon: "secure",       title: "보증금 관리",   desc: "수령·반환·시설점검 워크플로우" },
    ],
    process: [
      { step: 1, title: "자산 진단",   desc: "수익성·공실률 종합 평가" },
      { step: 2, title: "전속 위탁 계약", desc: "수수료(월 임대료 5~10%) 협의" },
      { step: 3, title: "임차인 모집", desc: "다채널 광고 + 매칭" },
      { step: 4, title: "운영·수금",   desc: "민원·시설·임대료" },
      { step: 5, title: "월 정산",     desc: "임대인 계좌 송금 + 보고서" },
    ],
    pricing: [
      { item: "전속 위탁 수수료", price: "월 임대료의 5~10%",   note: "건물 규모·관리 범위" },
      { item: "신규 임차 성공 수수료", price: "월 임대료 1개월분", note: "관행 기준 — 협의 가능" },
      { item: "공실 광고비",        price: "월 정액 협의" },
      { item: "법무 자문 연결",     price: "사례별 별도",         note: "변호사 직접 비용은 별도" },
    ],
    faq: [
      { q: "수수료는 정말 5~10%인가요?", a: "네. 단, 위탁 범위(자산 규모·민원량·법적 리스크)에 따라 협의로 조정 가능." },
      { q: "수익이 나지 않는 건물도 위탁 가능한가요?", a: "가능. 단, 첫 1~3개월은 정상화 단계로 운영비가 클 수 있음. 사전 합의 필수." },
      { q: "임대인은 임차인과 직접 소통해야 하나요?", a: "아니요. 모든 임차인 응대는 JNP 가 단일 창구로 처리." },
    ],
    casesTags: ["vacancy", "match", "ops"],
  },
  {
    slug: "hug",
    title: "HUG 대위변제 대응",
    tagline: "보증사고 발생 임대인의 동행자",
    category: "HUG Recovery",
    hue: 5,
    description: "전세보증 대위변제 통보를 받으신 임대인을 위한 종합 동행 서비스. 자산 정리 · 임차인 정리 · 후속 법적 절차까지 JNP의 풍부한 실전 경험으로 함께합니다.",
    highlights: [
      { icon: "alert",        title: "초기 대응 진단",   desc: "통보서 분석 + 변제 일정 정리" },
      { icon: "legal",        title: "법무 자문 연결",   desc: "변호사 협력 네트워크" },
      { icon: "user",         title: "임차인 정리",     desc: "퇴거 협의·잔금 정산" },
      { icon: "rent",         title: "재임대 운영",     desc: "정상화 후 안정 수금" },
      { icon: "secure",       title: "신용·재산 보호",   desc: "압류·강제집행 대비 컨설팅" },
      { icon: "checklist",    title: "월별 진행 보고",   desc: "변제·임차인·신용 상태 정리" },
    ],
    process: [
      { step: 1, title: "긴급 상담",   desc: "통보서 + 채권관계 청취" },
      { step: 2, title: "정리 계획",   desc: "법무·임차인·자산 3축 진단" },
      { step: 3, title: "임차인 협의", desc: "퇴거·잔금 합의" },
      { step: 4, title: "후속 운영",   desc: "재임대 + 정상화 진행" },
    ],
    pricing: [
      { item: "긴급 상담",        price: "무료" },
      { item: "동행 컨설팅",      price: "월 정액 (사례별 협의)" },
      { item: "법무 자문 비용",    price: "변호사 직접 청구",   note: "JNP 가 협상 보조" },
      { item: "재임대 위탁",      price: "위탁수수료 적용",     note: "위탁임대관리 항목 참조" },
    ],
    faq: [
      { q: "대위변제 통보를 받은 직후에 연락드려도 되나요?", a: "오히려 일찍 연락 주실수록 좋습니다. 변제 일정·재산 보호 대비가 빠를수록 손실 최소화." },
      { q: "임대인의 신용은 어떻게 되나요?", a: "사례별 다름. HUG 와의 합의 + 분할 변제 등 다양한 옵션을 함께 검토합니다." },
      { q: "변호사를 직접 알아봐야 하나요?", a: "JNP 협력 변호사 네트워크 통해 첫 상담은 무료로 연결 가능." },
    ],
    casesTags: ["hug", "dispute"],
  },
  {
    slug: "dispute",
    title: "세입자 분쟁·전세사기 대응",
    tagline: "임대 분쟁의 현장 중재자",
    category: "Dispute Resolution",
    hue: 280,
    description: "임차인 장기 연체·명도 거부·전세사기 의심 등 일반 관리회사가 손대지 않는 사건도 JNP 가 직접 현장에서 중재합니다. 법적 절차·증거 수집·합의 협상까지 동행.",
    highlights: [
      { icon: "scale",        title: "분쟁 진단",       desc: "법적 근거·증거 수집 검토" },
      { icon: "user",         title: "현장 중재",       desc: "임차인 협상·합의 도출" },
      { icon: "legal",        title: "법무 절차 동행",   desc: "내용증명·명도소송 협력" },
      { icon: "rent",         title: "채권 회수",       desc: "분할·합의 회수 협상" },
      { icon: "checklist",    title: "증거 일원화",     desc: "사진·문자·서면 정리" },
      { icon: "secure",       title: "임대인 안전",     desc: "보복·협박 방어 컨설팅" },
    ],
    process: [
      { step: 1, title: "사건 청취",   desc: "임대인·임차인 양측 정보" },
      { step: 2, title: "증거 수집",   desc: "현장 점검 + 서면 정리" },
      { step: 3, title: "협상·중재",   desc: "단계적 합의 시도" },
      { step: 4, title: "법적 절차",   desc: "필요 시 변호사 연계" },
    ],
    pricing: [
      { item: "긴급 상담",      price: "무료" },
      { item: "중재 동행비",    price: "사례별 협의",        note: "보통 회수액 5~10%" },
      { item: "법적 절차 협력",  price: "변호사 비용 별도" },
    ],
    faq: [
      { q: "전세사기 의심 시 가장 먼저 해야 할 일은?", a: "임대인·중개사 정보 확인 + 보증금 잔액 + 등기부등본 변동 모니터링. 24시간 안에 행동 권장." },
      { q: "명도소송은 얼마나 걸리나요?", a: "통상 4~6개월. 단, 합의 명도 시 2~3주 내 종결 가능." },
      { q: "임차인이 폭력·협박을 한다면?", a: "즉시 경찰 신고 + 변호사 자문 연결. JNP 가 보호 컨설팅 동행." },
    ],
    casesTags: ["dispute", "hug"],
  },
];

export function getServiceArea(slug: string): ServiceArea | undefined {
  return SERVICE_AREAS.find(s => s.slug === slug);
}
