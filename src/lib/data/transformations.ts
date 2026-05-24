/**
 * 부실 건물 정상화 Before/After 데이터 (P21-20).
 * BLOCKERS B-002 실제 사진 없음 → SVG/메트릭 위주.
 */

export interface Transformation {
  id: string;
  title: string;
  beforeLabel: string;
  afterLabel: string;
  metrics: { label: string; before: string; after: string; trend: "up" | "down" }[];
  durationMonths: number;
  /** Before 컬러 (HSL) — 칙칙한 톤 */
  beforeHue: number;
  /** After 컬러 (HSL) — 밝은 톤 */
  afterHue: number;
}

export const TRANSFORMATIONS: Transformation[] = [
  {
    id: "t-001",
    title: "오피스텔 종합 정상화 (부천 중동)",
    beforeLabel: "공실·연체 누적 · 시설 노후",
    afterLabel: "정상 운영 · 안정 수금",
    metrics: [
      { label: "공실률", before: "40%", after: "12%", trend: "down" },
      { label: "월 수금률", before: "60%", after: "97%", trend: "up" },
      { label: "민원 처리 평균", before: "11일", after: "2일", trend: "down" },
    ],
    durationMonths: 4,
    beforeHue: 25,
    afterHue: 200,
  },
  {
    id: "t-002",
    title: "빌라 HUG 대위변제 후속 (서울 양천)",
    beforeLabel: "보증사고 후 임차인 5명 동시 퇴거 위기",
    afterLabel: "법무·중재 동행 후 재계약 안정화",
    metrics: [
      { label: "공실 호실", before: "5호", after: "1호", trend: "down" },
      { label: "재계약률", before: "0%", after: "90%", trend: "up" },
      { label: "법적 분쟁", before: "3건", after: "0건", trend: "down" },
    ],
    durationMonths: 6,
    beforeHue: 0,
    afterHue: 145,
  },
  {
    id: "t-003",
    title: "임차인 매칭 가속 (부천 상동 신축)",
    beforeLabel: "입주 시즌 놓침 · 1.5개월 비입주",
    afterLabel: "다채널 광고 + 부동산망 활용",
    metrics: [
      { label: "3주 점유율", before: "0%", after: "80%", trend: "up" },
      { label: "광고 채널", before: "1개", after: "4개", trend: "up" },
      { label: "문의 → 계약", before: "5%", after: "23%", trend: "up" },
    ],
    durationMonths: 1,
    beforeHue: 220,
    afterHue: 145,
  },
];
