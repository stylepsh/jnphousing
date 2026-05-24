/**
 * 직원 소개 데이터 (P22-31).
 * BLOCKERS B-104 — 부장님 실 데이터 받으면 교체.
 */

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  experienceYears: number;
  introduction: string;
  expertise: string[];
  email?: string;
  initials: string;
  /** 카드 배경 hue (HSL) */
  hue: number;
}

export const STAFF: StaffMember[] = [
  {
    id: "staff-park-jh",
    name: "박재흥",
    role: "대표",
    experienceYears: 27,
    initials: "박재",
    hue: 215,
    introduction: "1999년부터 부천 일대 주택관리를 시작해 27년간 위탁임대 운영·HUG 대응·세입자 분쟁 중재 등 위기 자산 정상화에 집중. JNP주택관리 설립자.",
    expertise: ["위탁임대관리", "HUG 대위변제 대응", "세입자 분쟁 중재", "부실 건물 정상화"],
    email: "info@jnphousing.com",
  },
  {
    id: "staff-team",
    name: "운영팀",
    role: "관리·중재 협력",
    experienceYears: 15,
    initials: "JNP",
    hue: 145,
    introduction: "법무·시설·중개사·청소·보안 등 분야별 협력업체 네트워크로 즉시 대응 가능한 통합 운영팀. 24시간 긴급 출동·증거 수집·중재 동행.",
    expertise: ["긴급 시설 대응", "법무 자문 연결", "중개사 협력", "임차인 응대"],
  },
];
