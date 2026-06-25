// 답사지(PDF·엑셀) 공통 행 계산 — 선택한 물건 + 같은 임대인의 기존 답사완료(회색) 합치고
// 지역▸임대인 순으로 정렬한다. PDF와 엑셀이 같은 함수를 써서 번호(property_no)·순서가
// 정확히 일치하도록 보장한다. admin 전용(route 에서 requireAdmin 후 호출), service_role 조회.
import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { groupByRegion } from "@/lib/auction/survey-group";
import { normalizeOwnerName, ownerNameAnchor } from "@/lib/auction/court-auction";

export interface SurveyRow {
  id: string;
  property_no: number;
  case_number: string;
  court: string | null;
  category: string | null;
  address: string;
  address_short: string | null;
  owner_name: string | null;
  creditor: string | null;
  survey_status?: string | null;
  survey_date?: string | null;
}

const SEL =
  "id, property_no, case_number, court, category, address, address_short, owner_name, creditor, survey_status, survey_date";

const DONE_STATUSES = ["vacant", "occupied", "skip"];
const isDone = (s: string | null | undefined) =>
  s === "vacant" || s === "occupied" || s === "skip";

/**
 * 선택한 id 들로 답사지 행을 계산한다.
 * - ordered: 답사 대상 + 같은 임대인의 기존 답사완료(회색) 합쳐 지역▸임대인 정렬(=PDF 인쇄 순서)
 * - todoRows: 그중 실제 답사 대상(미답사/재방문)만 — 발급 귀속·엑셀 입력칸 대상
 * - regionLabel: "지역" 또는 "지역 외 N곳"
 */
export async function computeSurveySheetRows(ids: string[]): Promise<{
  selRows: SurveyRow[];
  ordered: SurveyRow[];
  todoRows: SurveyRow[];
  regionLabel: string;
}> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("auction_property")
    .select(SEL)
    .in("id", ids)
    .order("owner_name", { ascending: true })
    .order("address", { ascending: true });

  const selRows = (data ?? []) as SurveyRow[];
  if (selRows.length === 0) return { selRows: [], ordered: [], todoRows: [], regionLabel: "" };

  // 선택분 임대인의 "이미 답사한" 물건(공실/거주/제외)을 회색 패스 줄로 자동 합쳐 재방문을 막는다.
  // 임대인은 정규화 키로 묶고("대성하우징(주)"="(주)대성하우징"), ilike 앵커로 후보를 넓게 가져온다.
  const selectedIds = new Set(selRows.map((r) => r.id));
  const ownerKeys = new Set(selRows.map((r) => normalizeOwnerName(r.owner_name)).filter(Boolean));
  const anchors = Array.from(
    new Set(selRows.map((r) => ownerNameAnchor(r.owner_name)).filter((a) => a.length >= 2)),
  );
  let surveyedExtra: SurveyRow[] = [];
  if (ownerKeys.size > 0 && anchors.length > 0) {
    const orFilter = anchors.map((a) => `owner_name.ilike.%${a}%`).join(",");
    const { data: extra } = await supabase
      .from("auction_property")
      .select(SEL)
      .in("survey_status", DONE_STATUSES)
      .or(orFilter);
    surveyedExtra = ((extra ?? []) as SurveyRow[]).filter(
      (r) => !selectedIds.has(r.id) && ownerKeys.has(normalizeOwnerName(r.owner_name)),
    );
  }

  const byId = new Map<string, SurveyRow>();
  for (const r of [...selRows, ...surveyedExtra]) byId.set(r.id, r);
  const rows = Array.from(byId.values());

  const groups = groupByRegion(rows);
  const ordered = groups.flatMap(([, list]) => list);
  const regionLabel =
    groups.length === 1 ? groups[0][0] : `${groups[0][0]} 외 ${groups.length - 1}곳`;
  const todoRows = ordered.filter((it) => !isDone(it.survey_status));

  return { selRows, ordered, todoRows, regionLabel };
}
