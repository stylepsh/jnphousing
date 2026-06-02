/**
 * 박성혁 회사가 위탁관리 중인 건물 마스터 (P32).
 *
 * 엑셀 'JNP-건물위탁관리.xlsx' 의 '관리건물all' 시트 추출.
 * DB properties 테이블에 import 할 데이터.
 */

export interface ManagedBuilding {
  shortAlias: string;          // 짧은 별칭 (신림더로프트 등)
  fullName?: string;
  businessName?: string;       // 사업자명
  businessNumber?: string;     // 사업자등록번호
  corporateNumber?: string;    // 고유번호증
  landlordBusinessName?: string;  // 임사자 (LANDLORD_BUSINESS_SEED 매핑)
  address?: string;
  entrancePassword?: string;   // 공동현관 비밀번호 (보안상 마스킹 권장)
  managementAccount?: string;  // 관리단 계좌
  serviceModes: ("dm" | "housing_mgmt" | "rental_consigned")[];
  notes?: string;
}

export const MANAGED_BUILDINGS_SEED: ManagedBuilding[] = [
  {
    shortAlias: "신림더로프트",
    landlordBusinessName: "박정욱",
    address: "관악구 시흥대로158가길 25",
    serviceModes: ["housing_mgmt", "dm"],
  },
  {
    shortAlias: "봉천더로프트",
    landlordBusinessName: "정경모",
    businessName: "봉천더/정경모",
    address: "관악구 인현3길 41",
    serviceModes: ["housing_mgmt"],
  },
  {
    shortAlias: "교은",
    landlordBusinessName: "이장미",
    businessName: "이서이(이장미)",
    address: "정릉동 693-17",
    serviceModes: ["housing_mgmt", "dm"],
  },
  {
    shortAlias: "아세움",
    landlordBusinessName: "이장미",
    businessName: "(주)트라움하임 이장미",
    address: "정릉동 693-14",
    serviceModes: ["housing_mgmt"],
  },
  {
    shortAlias: "파크앤시티",
    landlordBusinessName: "파크앤시티",
    businessName: "㈜파크앤시티",
    address: "경기도 화성시 정남면 세자로 76, 202호 서측",
    serviceModes: ["housing_mgmt", "dm"],
  },
  {
    shortAlias: "파크 인계",
    landlordBusinessName: "파크앤시티",
    businessName: "㈜파크앤시티 (인계)",
    address: "수원시 장안구 조원동 726-4 / 현장: 인계동 1027-9",
    serviceModes: ["housing_mgmt"],
  },
  {
    shortAlias: "sl엠파이어",
    landlordBusinessName: "정경모",
    businessName: "sl/정경모",
    serviceModes: ["housing_mgmt"],
  },
  {
    shortAlias: "스토리캐슬 1",
    serviceModes: ["housing_mgmt"],
  },
  {
    shortAlias: "스토리캐슬 2",
    serviceModes: ["housing_mgmt"],
  },
  {
    shortAlias: "스토리캐슬 3",
    serviceModes: ["housing_mgmt"],
  },
  {
    shortAlias: "골든프라자",
    landlordBusinessName: "양희정",
    businessName: "양희정 010-9537-7501",
    serviceModes: ["housing_mgmt"],
  },
];
