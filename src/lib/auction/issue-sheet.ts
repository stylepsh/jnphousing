import { createServiceClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export type SheetIssueInput = {
  propertyIds: string[];
  regionLabel: string;
  teamName?: string;
  kind: "pdf" | "xlsx";
  printedAtIso?: string;
};

type ServiceClient = ReturnType<typeof createServiceClient>;

type PreviousIssueState = {
  id: string;
  sheet_id: string | null;
  last_issued_at: string | null;
  last_issued_team: string | null;
};

/** UI 우회를 포함해 서버에서도 팀 미기재 발급을 차단한다. */
export function requireSheetTeamName(value: unknown): string {
  const teamName = typeof value === "string" ? value.trim() : "";
  if (!teamName) {
    throw new AppError("VALIDATION", "받는 답사팀을 입력해 주세요.");
  }
  return teamName;
}

function recordFailure(step: string, error: unknown, cleanupErrors: unknown[] = []): never {
  console.error("[auction sheet issue] record failed", { step, error, cleanupErrors });
  throw new AppError(
    "INTERNAL",
    "답사지 발급 기록에 실패했습니다. 파일은 배포되지 않았습니다. 다시 시도해 주세요.",
    { cause: error },
  );
}

/**
 * 여러 PostgREST 요청을 DB 트랜잭션으로 묶을 수 없으므로 실패 시 이미 반영된 변경을
 * 원래 값으로 되돌리고, 발급 헤더 삭제(cascade로 item 삭제)까지 시도한다.
 * sheet_id가 이번 발급값인 행만 복구하여 동시에 이뤄진 다른 발급을 덮어쓰지 않는다.
 */
async function rollbackSheetIssue(
  supabase: ServiceClient,
  sheetId: string,
  previousRows: PreviousIssueState[],
  updatedIds: Set<string>,
): Promise<unknown[]> {
  const cleanupErrors: unknown[] = [];
  const grouped = new Map<string, { values: Omit<PreviousIssueState, "id">; ids: string[] }>();

  for (const row of previousRows) {
    if (!updatedIds.has(row.id)) continue;
    const values = {
      sheet_id: row.sheet_id,
      last_issued_at: row.last_issued_at,
      last_issued_team: row.last_issued_team,
    };
    const key = JSON.stringify(values);
    const group = grouped.get(key) ?? { values, ids: [] };
    group.ids.push(row.id);
    grouped.set(key, group);
  }

  for (const { values, ids } of grouped.values()) {
    const { error } = await supabase
      .from("auction_property")
      .update(values)
      .eq("sheet_id", sheetId)
      .in("id", ids);
    if (error) cleanupErrors.push(error);
  }

  const { error: deleteError } = await supabase
    .from("auction_survey_sheet")
    .delete()
    .eq("id", sheetId);
  if (deleteError) cleanupErrors.push(deleteError);

  return cleanupErrors;
}

/**
 * 답사지 발급 기록 — PDF·엑셀 공통.
 *
 * 남기는 것: 발급(sheet: 지역·팀·수단·건수) + 발급 명단(auction_sheet_item)
 * + 물건의 마지막 배포 표시(last_issued_at/team, 목록 배지용).
 *
 * 기록에 실패한 파일을 실제 발급된 것으로 오인하지 않도록 모든 DB 오류를 전파한다.
 */
export async function recordSheetIssueWithClient(
  supabase: ServiceClient,
  input: SheetIssueInput,
): Promise<{ sheetId: string | null }> {
  const propertyIds = [...new Set(input.propertyIds.filter(Boolean))];
  const { regionLabel, kind } = input;
  if (propertyIds.length === 0) return { sheetId: null };

  const teamName = (input.teamName ?? "").trim() || null;
  const printedAt = input.printedAtIso ?? new Date().toISOString();

  const previousRows: PreviousIssueState[] = [];
  const CHUNK = 300;
  for (let i = 0; i < propertyIds.length; i += CHUNK) {
    const slice = propertyIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("auction_property")
      .select("id, sheet_id, last_issued_at, last_issued_team")
      .in("id", slice);
    if (error) recordFailure("snapshot auction_property", error);
    previousRows.push(...((data ?? []) as PreviousIssueState[]));
  }
  if (previousRows.length !== propertyIds.length) {
    recordFailure(
      "snapshot auction_property",
      new Error(`발급 대상 ${propertyIds.length}건 중 ${previousRows.length}건만 조회됨`),
    );
  }

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
  if (sheetErr || !sheetRow) recordFailure("insert auction_survey_sheet", sheetErr);
  const sheetId = (sheetRow as { id: string }).id;

  const updatedIds = new Set<string>();
  for (let i = 0; i < propertyIds.length; i += CHUNK) {
    const slice = propertyIds.slice(i, i + CHUNK);
    const { error: itemError } = await supabase
      .from("auction_sheet_item")
      .upsert(
        slice.map((property_id) => ({ sheet_id: sheetId, property_id })),
        { onConflict: "sheet_id,property_id" },
      );
    if (itemError) {
      const cleanupErrors = await rollbackSheetIssue(supabase, sheetId, previousRows, updatedIds);
      recordFailure("upsert auction_sheet_item", itemError, cleanupErrors);
    }

    const { error: propertyError } = await supabase
      .from("auction_property")
      .update({ sheet_id: sheetId, last_issued_at: printedAt, last_issued_team: teamName })
      .in("id", slice);
    if (propertyError) {
      const cleanupErrors = await rollbackSheetIssue(supabase, sheetId, previousRows, updatedIds);
      recordFailure("update auction_property", propertyError, cleanupErrors);
    }
    slice.forEach((id) => updatedIds.add(id));
  }

  return { sheetId };
}

export async function recordSheetIssue(input: SheetIssueInput): Promise<{ sheetId: string | null }> {
  return recordSheetIssueWithClient(createServiceClient(), input);
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
