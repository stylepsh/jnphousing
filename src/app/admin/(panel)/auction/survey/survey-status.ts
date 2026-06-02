// 서버/클라이언트 양쪽에서 import 가능한 공용 상수 (NOT "use client").
// 서버 컴포넌트가 "use client" 모듈의 런타임 값을 import하면 client reference만
// 넘어와 .map 등에서 깨지므로, 값 상수는 반드시 별도 모듈로 분리한다.

export interface SurveyItem {
  id: string;
  case_number: string;
  court: string | null;
  address: string;
  owner_name: string;
  category: string | null;
  appraisal_value: number | null;
  minimum_bid: number | null;
  survey_status: string;
  survey_date: string | null;
  survey_by: string | null;
  door_code: string | null;
  survey_memo: string | null;
}

export const SURVEY_STATUS: { value: string; label: string; color: string }[] = [
  { value: "pending", label: "미답사", color: "bg-slate-100 text-slate-600" },
  { value: "vacant", label: "공실", color: "bg-emerald-100 text-emerald-700" },
  { value: "occupied", label: "점유", color: "bg-rose-100 text-rose-700" },
  { value: "revisit", label: "재방문", color: "bg-amber-100 text-amber-700" },
  { value: "skip", label: "제외", color: "bg-slate-100 text-slate-400" },
];
