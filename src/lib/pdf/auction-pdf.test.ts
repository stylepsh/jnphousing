import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { summarizeSurveyPdfItems } from "./auction-survey-summary";

const localFont = path.join(process.cwd(), "public", "fonts", "NotoSansKR-Variable.ttf");

describe("경매 PDF 로컬 폰트 스모크", () => {
  it("배포 산출물에 한글 TTF를 번들한다", () => {
    expect(fs.existsSync(localFont)).toBe(true);
    expect(fs.statSync(localFont).size).toBeGreaterThan(1_000_000);
  });

  it("공실 인계·답사자 PDF를 네트워크 없이 생성한다", async () => {
    const output = execFileSync(process.execPath, [path.join(process.cwd(), "src", "test", "render-auction-pdf-smoke.cjs")], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 30_000,
    });
    const result = JSON.parse(output) as Record<string, { signature: string; bytes: number }>;
    for (const name of ["vacant", "inspector", "survey"]) {
      expect(result[name].signature).toBe("%PDF-");
      expect(result[name].bytes).toBeGreaterThan(10_000);
    }
  });

  it("revisit를 신규 답사로 세고 survey PDF도 로컬 폰트로 생성한다", async () => {
    const items = [
      { property_no: 1, case_number: "2026타경1", court: null, category: null, address: "경기도 수원시 팔달구", owner_name: "가나", survey_status: "revisit" },
      { property_no: 2, case_number: "2026타경2", court: null, category: null, address: "경기도 수원시 팔달구", owner_name: "가나", survey_status: "vacant" },
    ];
    expect(summarizeSurveyPdfItems(items)).toEqual({ todoCount: 1, referenceCount: 1 });
  });
});
