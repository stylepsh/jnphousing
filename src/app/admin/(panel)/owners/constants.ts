// 서버/클라 양쪽에서 import 가능한 공용 상수 (NOT "use client").

export const MODE_LABEL: Record<string, { label: string; color: string }> = {
  housing_mgmt:     { label: "건물 위탁관리", color: "bg-blue-100 text-blue-700" },
  rental_consigned: { label: "위탁임대관리", color: "bg-emerald-100 text-emerald-700" },
  rental:           { label: "위탁임대관리", color: "bg-emerald-100 text-emerald-700" },
  dm:               { label: "JNP 단기임대", color: "bg-purple-100 text-purple-700" },
};

export function modeLabel(mode: string): { label: string; color: string } {
  return MODE_LABEL[mode] ?? { label: mode, color: "bg-slate-100 text-slate-600" };
}

// 건물 등록 시 선택 (관리유형) — 물건이 source, 소유주 카드엔 자동 합산
export const MODE_OPTIONS: { key: string; label: string }[] = [
  { key: "housing_mgmt", label: "건물 위탁관리" },
  { key: "rental_consigned", label: "위탁임대관리" },
];

export const TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: "villa", label: "빌라/다세대" },
  { key: "apartment", label: "아파트" },
  { key: "officetel", label: "오피스텔" },
  { key: "commercial", label: "상가" },
];

export interface OwnerPipeline {
  owner_id: string;
  owner_name: string;
  building_count: number;
  unit_count: number;
  vacant_count: number;
  occupied_count: number;
  month_invoice_count: number;
  month_paid_count: number;
  month_overdue_count: number;
}
