export interface SurveyStatusItem {
  survey_status?: string | null;
}

const DONE_SURVEY_STATUSES = new Set(["vacant", "occupied", "skip"]);

export function isCompletedSurveyReference(item: SurveyStatusItem): boolean {
  return !!item.survey_status && DONE_SURVEY_STATUSES.has(item.survey_status);
}

export function summarizeSurveyPdfItems(items: SurveyStatusItem[]) {
  const referenceCount = items.filter(isCompletedSurveyReference).length;
  return { todoCount: items.length - referenceCount, referenceCount };
}
