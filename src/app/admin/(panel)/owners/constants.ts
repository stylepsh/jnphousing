// 서버/클라 양쪽에서 import 가능한 공용 상수 (NOT "use client").

export const MODE_LABEL: Record<string, { label: string; color: string }> = {
  housing_mgmt:     { label: "주택관리",     color: "bg-blue-100 text-blue-700" },
  rental_consigned: { label: "위탁임대관리", color: "bg-emerald-100 text-emerald-700" },
  rental:           { label: "임대관리",     color: "bg-emerald-100 text-emerald-700" },
  dm:               { label: "단기임대",     color: "bg-purple-100 text-purple-700" },
};

export function modeLabel(mode: string): { label: string; color: string } {
  return MODE_LABEL[mode] ?? { label: mode, color: "bg-slate-100 text-slate-600" };
}

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
