/**
 * 경매 답사 점유 어휘 단일 출처.
 * server-only 없음 — 클라이언트에서도 라벨 표시에 사용 가능.
 */

export type Occupancy = "vacant" | "occupied" | "recheck";

// occupancy → auction_property.survey_status 어휘 (recheck→revisit)
export const SURVEY_STATUS_OF: Record<Occupancy, string> = {
  vacant: "vacant",
  occupied: "occupied",
  recheck: "revisit",
};

// occupancy → 판정 파이프라인 상태 (vacant 기본 Approved; 공실+개문가능은 호출부에서 WorkPrep 처리)
export const JUDGE_STATE_OF: Record<Occupancy, string> = {
  vacant: "Approved",
  occupied: "OccupiedHold",
  recheck: "Recheck",
};

export const OCCUPANCY_LABEL: Record<Occupancy, string> = {
  vacant: "공실",
  occupied: "점유",
  recheck: "재방문",
};
