// 답사지(PDF·엑셀) 공통 행 계산 — 선택한 물건 + 같은 임대인의 기존 답사완료(회색) 합치고
// 지역▸임대인 순으로 정렬한다. PDF와 엑셀이 같은 함수를 써서 번호(property_no)·순서가
// 정확히 일치하도록 보장한다. admin 전용(route 에서 requireAdmin 후 호출), service_role 조회.
import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { groupByRegion, regionKey } from "@/lib/auction/survey-group";
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

  // id 를 한 번의 .in() 에 다 넣으면 URL 길이 한도를 넘긴다(수백 건 발급 시 실패).
  // 청크로 나눠 조회하고 합친다.
  const selRows: SurveyRow[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("auction_property")
      .select(SEL)
      .in("id", ids.slice(i, i + 200))
      .order("owner_name", { ascending: true })
      .order("address", { ascending: true });
    if (error) {
      console.error("[computeSurveySheetRows] 물건 조회 실패", error);
      throw new AppError("INTERNAL", "물건 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
    }
    selRows.push(...((data ?? []) as SurveyRow[]));
  }
  if (selRows.length === 0) return { selRows: [], ordered: [], todoRows: [], regionLabel: "" };

  // 선택분 임대인의 "이미 답사한" 물건(공실/거주/제외)을 회색 패스 줄로 자동 합쳐 재방문을 막는다.
  // 임대인은 정규화 키로 묶고("대성하우징(주)"="(주)대성하우징"), ilike 앵커로 후보를 넓게 가져온다.
  // ★ 단, 회색 줄은 "선택한 지역" 안에 있는 것만 남긴다. 같은 임대인이 안 누른 다른 지역
  //   (예: 안산·시흥)에 답사완료 물건을 가졌다고 그 지역 블록이 통째로 딸려 나오면 안 됨.
  const selectedIds = new Set(selRows.map((r) => r.id));
  const selectedRegions = new Set(selRows.map((r) => regionKey(r.address)));
  const ownerKeys = new Set(selRows.map((r) => normalizeOwnerName(r.owner_name)).filter(Boolean));
  const anchors = Array.from(
    new Set(selRows.map((r) => ownerNameAnchor(r.owner_name)).filter((a) => a.length >= 2)),
  );
  // 지역 조건을 DB 쿼리에도 건다.
  // (예전에는 임대인명으로만 전국을 조회한 뒤 메모리에서 지역을 걸렀다 →
  //  Supabase 기본 반환 상한 1,000행에 잘려 해당 지역 물건이 조용히 누락될 수 있었다.)
  // DB 의 region_key 는 주소 앞 2토큰, 화면의 regionKey() 는 3토큰이라
  // 2토큰 집합으로 넓게 거른 뒤(인덱스 사용) 3토큰으로 정확히 맞춘다.
  const region2 = (addr: string) => (addr || "").trim().split(/\s+/).slice(0, 2).join(" ");
  const regionPrefixes = Array.from(new Set(selRows.map((r) => region2(r.address)).filter(Boolean)));

  let surveyedExtra: SurveyRow[] = [];
  if (ownerKeys.size > 0 && anchors.length > 0 && regionPrefixes.length > 0) {
    const orFilter = anchors.map((a) => `owner_name.ilike.%${a}%`).join(",");
    const { data: extra, error: extraErr } = await supabase
      .from("auction_property")
      .select(SEL)
      .in("survey_status", DONE_STATUSES)
      .in("region_key", regionPrefixes)
      .or(orFilter)
      .limit(5000);
    if (extraErr) {
      console.error("[computeSurveySheetRows] 기존 답사완료 조회 실패", extraErr);
      throw new AppError("INTERNAL", "기존 답사 이력을 불러오지 못했습니다. 다시 시도해 주세요.");
    }
    surveyedExtra = ((extra ?? []) as SurveyRow[]).filter(
      (r) =>
        !selectedIds.has(r.id) &&
        ownerKeys.has(normalizeOwnerName(r.owner_name)) &&
        selectedRegions.has(regionKey(r.address)),
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
