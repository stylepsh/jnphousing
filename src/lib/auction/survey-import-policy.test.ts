import { describe, expect, it } from "vitest";
import { shouldSkipSurveyImport } from "./survey-import-policy";

describe("답사표 재업로드 정책", () => {
  it.each(["vacant", "occupied", "skip", "rejected", "blocked"])(
    "이미 확정된 %s 물건은 다시 처리하지 않는다",
    (status) => {
      expect(shouldSkipSurveyImport(status)).toBe(true);
    },
  );

  it.each([null, undefined, "pending", "revisit"])(
    "아직 답사가 필요한 %s 물건은 처리한다",
    (status) => {
      expect(shouldSkipSurveyImport(status)).toBe(false);
    },
  );
});
