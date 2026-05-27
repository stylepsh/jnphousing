/**
 * 사이트 공개 페이지 이미지 마스터
 * Unsplash 라이센스 (무료/상업 OK).
 * 박성혁님 실제 건물 사진 촬영 후 Supabase Storage 로 교체 예정.
 */

const UNSPLASH = "https://images.unsplash.com";
const Q = "?w=1920&q=80&auto=format&fit=crop";
const Q_MED = "?w=1200&q=80&auto=format&fit=crop";
const Q_SM = "?w=800&q=80&auto=format&fit=crop";

// ─── Hero ───
export const HERO_IMAGES = {
  primary: `${UNSPLASH}/photo-1545324418-cc1a3fa10c00${Q}`,        // 모던 주거 외관 (어두운 톤)
  secondary: `${UNSPLASH}/photo-1486406146926-c627a92ad1ab${Q}`,   // 도시 빌딩 스카이라인
  tertiary: `${UNSPLASH}/photo-1448630360428-65456885c650${Q}`,    // 모던 빌딩
};

// ─── 관리현장 (박성혁 11개 건물 placeholder) ───
// 박성혁님 실제 사진 촬영 후 Supabase Storage 로 교체 시
// `bg-[url('https://supabase.../신림더로프트.jpg')]` 로 갱신.
export const PROPERTY_PLACEHOLDERS: Record<string, string> = {
  officetel:        `${UNSPLASH}/photo-1545324418-cc1a3fa10c00${Q_MED}`,
  apartment:        `${UNSPLASH}/photo-1582268611958-ebfd161ef9cf${Q_MED}`,
  villa:            `${UNSPLASH}/photo-1564013799919-ab600027ffc6${Q_MED}`,
  commercial:       `${UNSPLASH}/photo-1486406146926-c627a92ad1ab${Q_MED}`,
};

// ─── 샘플 관리현장 (DB 비어있을 때) ───
export const SAMPLE_PROPERTIES = [
  { name: "신림더로프트",  alias: "신림더",      type: "officetel",  units: 32, region: "서울 관악구",  image: `${UNSPLASH}/photo-1545324418-cc1a3fa10c00${Q_MED}` },
  { name: "봉천더로프트",  alias: "봉천더",      type: "officetel",  units: 28, region: "서울 관악구",  image: `${UNSPLASH}/photo-1493809842364-78817add7ffb${Q_MED}` },
  { name: "교은",          alias: "교은",        type: "officetel",  units: 24, region: "서울 성북구",  image: `${UNSPLASH}/photo-1564013799919-ab600027ffc6${Q_MED}` },
  { name: "아세움",        alias: "아세움",      type: "apartment",  units: 36, region: "서울 성북구",  image: `${UNSPLASH}/photo-1480714378408-67cf0d13bc1b${Q_MED}` },
  { name: "파크앤시티",    alias: "파크앤시티",  type: "officetel",  units: 48, region: "경기 화성시",  image: `${UNSPLASH}/photo-1494526585095-c41746248156${Q_MED}` },
  { name: "골든프라자",    alias: "골든",        type: "commercial", units: 12, region: "경기 부천시",  image: `${UNSPLASH}/photo-1486406146926-c627a92ad1ab${Q_MED}` },
];

// ─── 시설관리 6종 카테고리 ───
export const CATEGORY_IMAGES = {
  internet: {
    label: "통신·인터넷",
    image: `${UNSPLASH}/photo-1558494949-ef010cbdcc31${Q_SM}`,
    description: "건물 단지망·공동현관·CCTV 통신 통합관리",
  },
  cleaning: {
    label: "청소·환경",
    image: `${UNSPLASH}/photo-1581578731548-c64695cc6952${Q_SM}`,
    description: "공용부 일일·주간·월간 정기청소 + 폐기물",
  },
  electric: {
    label: "전기·안전",
    image: `${UNSPLASH}/photo-1473341304170-971dccb5ac1e${Q_SM}`,
    description: "전기안전점검·고압설비·예비전원",
  },
  water: {
    label: "급배수·설비",
    image: `${UNSPLASH}/photo-1607472586893-edb57bdc0e39${Q_SM}`,
    description: "공동급수·정수·배수 + 누수 긴급대응",
  },
  fire: {
    label: "소방·방재",
    image: `${UNSPLASH}/photo-1582215288937-c20a44a7c0f0${Q_SM}`,
    description: "소방시설 점검·소방안전관리자 운영",
  },
  elevator: {
    label: "승강기·기계",
    image: `${UNSPLASH}/photo-1545194193-eda3d22e6772${Q_SM}`,
    description: "월간 정기 점검·24시간 긴급출동",
  },
} as const;

// ─── 회사·신뢰 섹션 ───
export const TRUST_IMAGE  = `${UNSPLASH}/photo-1556761175-5973dc0f32e7${Q_MED}`; // 비즈니스 미팅
export const TEAM_IMAGE   = `${UNSPLASH}/photo-1521737852567-6949f3f9f2b5${Q_MED}`; // 팀
export const CTA_IMAGE    = `${UNSPLASH}/photo-1577760258779-e787a1733016${Q}`;    // 상담 / 검토
