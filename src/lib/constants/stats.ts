/**
 * JNP주택관리 운영 통계 (P21 사용).
 *
 * 박성혁 명시 임시값 (BLOCKERS B-001) — 실측 후 교체 가능.
 */

export const COMPANY_STATS = {
  operatedBuildings: 32,
  managedUnits: 480,
  resolvedDisputes: 67,
  yearsAsTeam: 27,
} as const;

export const STAT_CARDS = [
  { key: "operatedBuildings", label: "운영 건물", suffix: "+", end: COMPANY_STATS.operatedBuildings, iconKey: "building" },
  { key: "managedUnits",      label: "관리 세대", suffix: "+", end: COMPANY_STATS.managedUnits,      iconKey: "unit" },
  { key: "resolvedDisputes",  label: "해결 분쟁", suffix: "+", end: COMPANY_STATS.resolvedDisputes,  iconKey: "secure" },
  { key: "yearsAsTeam",       label: "운영 경력", suffix: "년", end: COMPANY_STATS.yearsAsTeam,      iconKey: "award" },
] as const;
