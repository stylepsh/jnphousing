const IMMUTABLE_IMPORT_STATUSES = new Set([
  "vacant",
  "occupied",
  "skip",
  "rejected",
  "blocked",
]);

/**
 * 답사표 일괄 업로드는 최초 판정만 만든다.
 * 완료·제외·차단된 물건의 수정은 개별 검토 화면에서 명시적으로 처리한다.
 */
export function shouldSkipSurveyImport(existingStatus: string | null | undefined): boolean {
  return !!existingStatus && IMMUTABLE_IMPORT_STATUSES.has(existingStatus);
}
