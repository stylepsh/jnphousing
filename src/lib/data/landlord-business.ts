/**
 * 임사자(임대사업자) 마스터 데이터 (P32).
 *
 * 박성혁 엑셀 'JNP-건물위탁관리.xlsx' 에서 추출.
 * DB landlord_business 테이블 비어있을 때 fallback.
 */

export interface LandlordBusiness {
  id: string;
  name: string;                  // 임사자 명 (사람 이름)
  businessName?: string;         // 사업자명 (법인명 등)
  representativeName?: string;   // 대표자
  phoneHint?: string;            // 연락처 끝자리 힌트
  notes?: string;
}

export const LANDLORD_BUSINESS_SEED: LandlordBusiness[] = [
  {
    id: "lb-yhi-jang",
    name: "이장미",
    businessName: "(주)트라움하임",
    representativeName: "이장미",
    notes: "트라움 건물 위탁",
  },
  {
    id: "lb-park-jw",
    name: "박정욱",
    businessName: "박정욱 개인사업자",
    representativeName: "박정욱",
    notes: "신림더로프트 외 다수",
  },
  {
    id: "lb-park-jc",
    name: "박정완",
    businessName: "박정완 개인사업자",
    notes: "건물 위탁",
  },
  {
    id: "lb-traum",
    name: "트라움",
    businessName: "(주)트라움하임",
    notes: "법인",
  },
  {
    id: "lb-haiyan",
    name: "하이안",
    notes: "건물 위탁",
  },
  {
    id: "lb-park-and-city",
    name: "파크앤시티",
    businessName: "㈜파크앤시티",
    notes: "법인",
  },
  {
    id: "lb-jung-km",
    name: "정경모",
    notes: "봉천더로프트·sl엠파이어 관련",
  },
  {
    id: "lb-kim-dm",
    name: "김동미",
    notes: "건물 위탁",
  },
  {
    id: "lb-yang-hj",
    name: "양희정",
    phoneHint: "010-9537-7501",
    notes: "골든프라자 관련",
  },
  // JNP 단기임대 임대인 (별도 라인)
  {
    id: "lb-lee-jw-dm",
    name: "이지웅",
    notes: "JNP 단기임대 (수익 분배 5:5)",
  },
  {
    id: "lb-kim-sh-dm",
    name: "김상혁",
    notes: "JNP 단기임대 (위탁)",
  },
  {
    id: "lb-kim-jh-dm",
    name: "김정호",
    notes: "JNP 단기임대 (5:2.5:2.5)",
  },
  {
    id: "lb-lim-sh-dm",
    name: "임수형",
    notes: "JNP 단기임대",
  },
  {
    id: "lb-lee-jy-dm",
    name: "이재영",
    businessName: "(주)리빙트리",
    notes: "JNP 단기임대 (매월 5일 지급, 7:3)",
  },
  {
    id: "lb-hwang-jh-dm",
    name: "황정현",
    notes: "JNP 단기임대 (6:2:2 서팀 포함)",
  },
];
