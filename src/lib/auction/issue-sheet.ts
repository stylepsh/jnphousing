import { createServiceClient } from "@/lib/supabase/server";

/**
 * 답사지 발급 기록 — PDF·엑셀 공통.
 *
 * 남기는 것: 발급(sheet: 지역·팀·수단·건수) + 발급 명단(auction_sheet_item)
 * + 물건의 마지막 배포 표시(last_issued_at/team, 목록 배지용).
 *
 * 마이그레이션 036 미적용 환경에서도 발급 자체(다운로드)는 막지 않는다 —
 * 기록만 조용히 건너뛴다.
 */
export async function recordSheetIssue(input: {
  propertyIds: string[];
  regionLabel: string;
  teamName?: string;
  kind: "pdf" | "xlsx";
  printedAtIso?: string;
}): Promise<{ sheetId: string | null }> {
  const { propertyIds, regionLabel, kind } = input;
  if (propertyIds.length === 0) return { sheetId: null };

  const teamName = (input.teamName ?? "").trim() || null;
  const printedAt = input.printedAtIso ?? new Date().toISOString();
  const supabase = createServiceClient();

  const { data: sheetRow, error: sheetErr } = await supabase
    .from("auction_survey_sheet")
    .insert({
      region_label: regionLabel,
      printed_at: printedAt,
      total_count: propertyIds.length,
      team_name: teamName,
      kind,
    })
    .select("id")
    .single();
  if (sheetErr || !sheetRow) return { sheetId: null };
  const sheetId = (sheetRow as { id: string }).id;

  const CHUNK = 300;
  for (let i = 0; i < propertyIds.length; i += CHUNK) {
    const slice = propertyIds.slice(i, i + CHUNK);
    await supabase
      .from("auction_sheet_item")
      .upsert(
        slice.map((property_id) => ({ sheet_id: sheetId, property_id })),
        { onConflict: "sheet_id,property_id" },
      );
    await supabase
      .from("auction_property")
      .update({ sheet_id: sheetId, last_issued_at: printedAt, last_issued_team: teamName })
      .in("id", slice);
  }

  return { sheetId };
}

/** 최근 사용한 답사팀 이름 (자유 입력 재사용용). */
export async function recentTeamNames(limit = 8): Promise<string[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_survey_sheet")
      .select("team_name, printed_at")
      .not("team_name", "is", null)
      .order("printed_at", { ascending: false })
      .limit(100);
    if (error) return [];
    const seen: string[] = [];
    for (const r of (data ?? []) as { team_name: string | null }[]) {
      const t = (r.team_name ?? "").trim();
      if (t && !seen.includes(t)) seen.push(t);
      if (seen.length >= limit) break;
    }
    return seen;
  } catch {
    return [];
  }
}
