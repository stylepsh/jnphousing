# 경매 답사표 엑셀 왕복 + 파이프라인 연결 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 표준 답사표 엑셀을 내보내고(식별칸 미리 채움), 답사자가 채워온 엑셀/CSV를 업로드하면 사건번호로 매칭해 기존 경매 답사 파이프라인(Inspecting→Reviewing→판정)에 일괄 적재한다.

**Architecture:** 신규 테이블 없이 기존 `auction_property`·`auction_inspection`·`auction_survey_batch`·`auction_pipeline_event` 와 상태머신(`@/lib/auction/pipeline/state-machine`)을 재사용한다. 순수 파싱 로직을 별도 모듈로 분리(TDD)하고, 서버액션이 파싱→매칭→inspection 생성→상태전이를 오케스트레이션한다. 엑셀은 ExcelJS, CSV는 papaparse.

**Tech Stack:** Next.js 15 (App Router, server actions), Supabase(service_role), ExcelJS 4.4, papaparse 5.5, zod 4, vitest 4.

## Global Constraints

- 금액은 정수(원). RLS 유지. 모든 서버액션 `requireAdmin()` 선두 호출. zod 입력 검증. ([[feedback-jnp-implementation-rules]])
- 서버 전용 모듈은 `import "server-only";`. DB 접근은 `createServiceClient()`.
- 채권자 분류는 기존 `classifyCreditor()` 재사용(중복 구현 금지).
- 점유 매핑 고정: **O→occupied / X→vacant / △→recheck**.
- 사건번호 정규화 = 공백 제거 후 비교(`caseNumber.replace(/\s/g,"")`).
- 커밋은 태스크 단위. 한국어 커밋 메시지 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `src/lib/auction/survey-sheet.ts` — **순수 로직**: 답사표 행 → 정규화 레코드(점유 매핑·임대인/채권 분리·주소 정리·헤더 감지). 외부 의존 없음.
- `src/lib/auction/survey-sheet.test.ts` — vitest 단위 테스트.
- `src/lib/auction/survey-export.ts` — `server-only`. 수집풀 → 표준 답사표 ExcelJS 워크북(식별칸 prefilled + 입력칸 드롭다운).
- `src/app/admin/(panel)/auction/pipeline/survey-template/route.ts` — 답사표 .xlsx 다운로드 GET 라우트.
- `src/app/admin/(panel)/auction/survey/import-actions.ts` — `importSurveySheet` 서버액션(파싱→매칭→inspection→전이).
- `src/app/admin/(panel)/auction/survey/survey-upload.tsx` — 업로드 UI(client) + 결과 요약.
- `supabase/migrations/027_auction_dedup_case_number.sql` — 사건번호 유니크 보조 인덱스.
- `src/app/admin/(panel)/auction/collection/actions.ts` — 중복차단을 사건번호 우선으로 보강(수정).

---

### Task 1: 순수 파싱 로직 `survey-sheet.ts` (TDD)

답사표의 지저분한 셀을 정규화하는 외부 의존 없는 함수들. 가장 리스크가 큰 부분이라 먼저 테스트로 고정한다.

**Files:**
- Create: `src/lib/auction/survey-sheet.ts`
- Test: `src/lib/auction/survey-sheet.test.ts`

**Interfaces:**
- Consumes: `classifyCreditor`, `HUG_CREDITOR_PATTERNS`, `SGI_CREDITOR_PATTERNS` from `@/lib/auction/court-auction`.
- Produces:
  - `mapOccupancy(raw: string | null): "vacant" | "occupied" | "recheck" | null`
  - `splitOwnerCreditor(raw: string | null): { ownerName: string | null; creditor: string | null }`
  - `cleanAddress(dong: string | null, detail: string | null): { address: string; addressShort: string | null }`
  - `mapTriState(raw: string | null, kind: "canOpen" | "merch"): string` (가능/불가/관리실확인/보류 → enum)
  - `mapMail(mail: string | null, memo: string | null): "none" | "normal" | "overflow"`
  - `interface SurveySheetRow { visitNo, dong, addressDetail, caseNumber, category, ownerCreditor, occupancy, canOpen, merch, mail, meter, doorCode, mgmtOffice, memo }` (all `string | null`)
  - `interface NormalizedSurvey { caseNumber: string | null; address: string; addressShort: string | null; ownerName: string | null; creditor: string | null; creditorType: "HUG"|"SGI"|"OTHER"; category: string | null; occupancy: "vacant"|"occupied"|"recheck"|null; canOpen: string; merch: string; mail: "none"|"normal"|"overflow"; meterCheck: Record<string,string>; doorCode: string | null; memo: string | null }`
  - `normalizeRow(row: SurveySheetRow): NormalizedSurvey`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/auction/survey-sheet.test.ts
import { describe, it, expect } from "vitest";
import { mapOccupancy, splitOwnerCreditor, cleanAddress, normalizeRow } from "./survey-sheet";

describe("mapOccupancy", () => {
  it("maps O/X/△ and fullwidth variants", () => {
    expect(mapOccupancy("O")).toBe("occupied");
    expect(mapOccupancy("o")).toBe("occupied");
    expect(mapOccupancy("X")).toBe("vacant");
    expect(mapOccupancy("x")).toBe("vacant");
    expect(mapOccupancy("△")).toBe("recheck");
    expect(mapOccupancy("▲")).toBe("recheck");
    expect(mapOccupancy("세모")).toBe("recheck");
    expect(mapOccupancy("")).toBeNull();
    expect(mapOccupancy(null)).toBeNull();
  });
});

describe("splitOwnerCreditor", () => {
  it("splits owner name from HUG/SGI creditor", () => {
    expect(splitOwnerCreditor("박국섭 주택도시보증공사")).toEqual({ ownerName: "박국섭", creditor: "주택도시보증공사" });
    expect(splitOwnerCreditor("한윤종 서울보증보험")).toEqual({ ownerName: "한윤종", creditor: "서울보증보험" });
  });
  it("handles owner only (no creditor keyword)", () => {
    expect(splitOwnerCreditor("김철수")).toEqual({ ownerName: "김철수", creditor: null });
  });
  it("handles null", () => {
    expect(splitOwnerCreditor(null)).toEqual({ ownerName: null, creditor: null });
  });
});

describe("cleanAddress", () => {
  it("collapses newlines and extracts road-name [..] as addressShort, prefixes dong", () => {
    expect(cleanAddress("정왕동", "2027-1 5층 501호 \n[오이도5길 14]")).toEqual({
      address: "정왕동 2027-1 5층 501호",
      addressShort: "오이도5길 14",
    });
  });
  it("works without bracket", () => {
    expect(cleanAddress("신천동", "746-15 4층 402호")).toEqual({
      address: "신천동 746-15 4층 402호",
      addressShort: null,
    });
  });
});

describe("normalizeRow", () => {
  it("normalizes a full survey row end-to-end", () => {
    const out = normalizeRow({
      visitNo: "1", dong: "정왕동", addressDetail: "2027-1 5층 501호 \n[오이도5길 14]",
      caseNumber: "2026-50022", category: "다세대", ownerCreditor: "박국섭 주택도시보증공사",
      occupancy: "O", canOpen: null, merch: null, mail: "X", meter: "O", doorCode: "X",
      mgmtOffice: "관리실:", memo: "퇴거 예정이라고 함",
    });
    expect(out.caseNumber).toBe("2026-50022");
    expect(out.ownerName).toBe("박국섭");
    expect(out.creditorType).toBe("HUG");
    expect(out.occupancy).toBe("occupied");
    expect(out.address).toBe("정왕동 2027-1 5층 501호");
    expect(out.addressShort).toBe("오이도5길 14");
    expect(out.meterCheck).toEqual({ mail: "X", meter: "O" });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- src/lib/auction/survey-sheet.test.ts`
Expected: FAIL — `Cannot find module './survey-sheet'`.

- [ ] **Step 3: Implement `survey-sheet.ts`**

```ts
// src/lib/auction/survey-sheet.ts
// 답사표(엑셀/CSV) 행 정규화 — 외부 의존 없는 순수 로직.
import { classifyCreditor, HUG_CREDITOR_PATTERNS, SGI_CREDITOR_PATTERNS, type CreditorType } from "@/lib/auction/court-auction";

const t = (v: string | null | undefined): string | null => {
  if (v == null) return null;
  const s = String(v).replace(/ /g, " ").trim();
  return s.length ? s : null;
};

export function mapOccupancy(raw: string | null): "vacant" | "occupied" | "recheck" | null {
  const s = t(raw);
  if (!s) return null;
  if (/^[oO0○]/.test(s)) return "occupied";
  if (/^[xX×]/.test(s)) return "vacant";
  if (/[△▲세모]/.test(s)) return "recheck";
  return null;
}

const ALL_CREDITOR_PATTERNS = [...HUG_CREDITOR_PATTERNS, ...SGI_CREDITOR_PATTERNS];

export function splitOwnerCreditor(raw: string | null): { ownerName: string | null; creditor: string | null } {
  const s = t(raw);
  if (!s) return { ownerName: null, creditor: null };
  for (const p of ALL_CREDITOR_PATTERNS) {
    const m = s.match(p);
    if (m) {
      const creditor = m[0];
      const ownerName = s.replace(m[0], "").trim() || null;
      return { ownerName, creditor };
    }
  }
  return { ownerName: s, creditor: null };
}

export function cleanAddress(dong: string | null, detail: string | null): { address: string; addressShort: string | null } {
  const d = t(detail) ?? "";
  const collapsed = d.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
  let addressShort: string | null = null;
  const bracket = collapsed.match(/\[([^\]]+)\]/);
  if (bracket) addressShort = bracket[1].trim();
  const base = collapsed.replace(/\s*\[[^\]]*\]\s*/g, " ").trim();
  const dongStr = t(dong);
  const address = [dongStr, base].filter(Boolean).join(" ").trim();
  return { address, addressShort };
}

export function mapTriState(raw: string | null, kind: "canOpen" | "merch"): string {
  const s = t(raw);
  if (kind === "canOpen") {
    if (!s) return "admin_check";
    if (/가능|possible|^o/i.test(s)) return "possible";
    if (/불가|impossible|^x/i.test(s)) return "impossible";
    return "admin_check";
  }
  if (!s) return "hold";
  if (/가능|ready|possible|^o/i.test(s)) return "possible";
  if (/불가|impossible|^x/i.test(s)) return "impossible";
  return "hold";
}

export function mapMail(mail: string | null, memo: string | null): "none" | "normal" | "overflow" {
  const m = t(mail);
  const memoS = t(memo) ?? "";
  if (/대량|다량|overflow|넘침/.test(memoS)) return "overflow";
  if (!m || /^[xX0×]/.test(m)) return "none";
  return "normal";
}

export interface SurveySheetRow {
  visitNo: string | null; dong: string | null; addressDetail: string | null;
  caseNumber: string | null; category: string | null; ownerCreditor: string | null;
  occupancy: string | null; canOpen: string | null; merch: string | null;
  mail: string | null; meter: string | null; doorCode: string | null;
  mgmtOffice: string | null; memo: string | null;
}

export interface NormalizedSurvey {
  caseNumber: string | null; address: string; addressShort: string | null;
  ownerName: string | null; creditor: string | null; creditorType: CreditorType;
  category: string | null; occupancy: "vacant" | "occupied" | "recheck" | null;
  canOpen: string; merch: string; mail: "none" | "normal" | "overflow";
  meterCheck: Record<string, string>; doorCode: string | null; memo: string | null;
}

export function normalizeRow(row: SurveySheetRow): NormalizedSurvey {
  const { ownerName, creditor } = splitOwnerCreditor(row.ownerCreditor);
  const { address, addressShort } = cleanAddress(row.dong, row.addressDetail);
  const meterCheck: Record<string, string> = {};
  if (t(row.mail)) meterCheck.mail = t(row.mail)!;
  if (t(row.meter)) meterCheck.meter = t(row.meter)!;
  const memoParts = [t(row.mgmtOffice), t(row.memo)].filter(Boolean);
  return {
    caseNumber: t(row.caseNumber)?.replace(/\s/g, "") ?? null,
    address, addressShort, ownerName, creditor,
    creditorType: classifyCreditor(creditor),
    category: t(row.category),
    occupancy: mapOccupancy(row.occupancy),
    canOpen: mapTriState(row.canOpen, "canOpen"),
    merch: mapTriState(row.merch, "merch"),
    mail: mapMail(row.mail, row.memo),
    meterCheck,
    doorCode: t(row.doorCode) && !/^[xX]$/.test(t(row.doorCode)!) ? t(row.doorCode) : null,
    memo: memoParts.length ? memoParts.join(" / ") : null,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/lib/auction/survey-sheet.test.ts`
Expected: PASS (4 describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auction/survey-sheet.ts src/lib/auction/survey-sheet.test.ts
git commit -m "feat(auction): 답사표 행 정규화 순수 로직 + 테스트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 파일 → SurveySheetRow[] 추출기 (TDD)

업로드된 CSV/xlsx 버퍼에서 헤더를 감지해 `SurveySheetRow[]` + 지역명을 뽑는다. CSV는 papaparse, xlsx는 ExcelJS. 시흥 CSV처럼 첫 줄이 지역명, 둘째 줄이 헤더, 셀 내 줄바꿈 포함을 처리.

**Files:**
- Modify: `src/lib/auction/survey-sheet.ts` (추출기 추가)
- Modify: `src/lib/auction/survey-sheet.test.ts`

**Interfaces:**
- Produces:
  - `extractRowsFromCsv(text: string): { region: string | null; rows: SurveySheetRow[] }`
  - `HEADER_ALIASES: Record<keyof SurveySheetRow, string[]>` (헤더 한글 별칭 → 필드)
  - `mapHeaderToFields(header: string[]): Partial<Record<number, keyof SurveySheetRow>>`

- [ ] **Step 1: Write failing tests** (시흥 CSV 첫 3건을 인라인 fixture로)

```ts
// append to src/lib/auction/survey-sheet.test.ts
import { extractRowsFromCsv } from "./survey-sheet";

const SIHEUNG_CSV = `시흥 단기임대,,,,,,,,,,,
방문순번,동,상세 주소,사건번호,물건종류,임대인·채권,점유 상태,우편,계량기,현관비번,관리실,비고
1,정왕동,"2027-1 5층 501호 
[오이도5길 14]",2026-50022,다세대,박국섭 주택도시보증공사,O,X,O,X,관리실:,
2,정왕동,"1942-1 계룡2차 212동 10층 1002호 
[정왕대로28번길 8]",2025-53851,아파트,박성호 주택도시보증공사,O,X,O,X,관리실:,퇴거 예정이라고 함`;

describe("extractRowsFromCsv", () => {
  it("detects region title and parses rows with multiline cells", () => {
    const { region, rows } = extractRowsFromCsv(SIHEUNG_CSV);
    expect(region).toBe("시흥 단기임대");
    expect(rows).toHaveLength(2);
    expect(rows[0].caseNumber).toBe("2026-50022");
    expect(rows[0].dong).toBe("정왕동");
    expect(rows[0].occupancy).toBe("O");
    expect(rows[0].ownerCreditor).toBe("박국섭 주택도시보증공사");
    expect(rows[0].addressDetail).toContain("오이도5길 14");
    expect(rows[1].memo).toBe("퇴거 예정이라고 함");
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/lib/auction/survey-sheet.test.ts` → FAIL (`extractRowsFromCsv` 미정의).

- [ ] **Step 3: Implement extractor**

```ts
// append to src/lib/auction/survey-sheet.ts
import Papa from "papaparse";

export const HEADER_ALIASES: Record<keyof SurveySheetRow, string[]> = {
  visitNo: ["방문순번", "순번", "no", "번호"],
  dong: ["동", "법정동", "행정동"],
  addressDetail: ["상세 주소", "상세주소", "주소", "소재지"],
  caseNumber: ["사건번호", "타경", "사건"],
  category: ["물건종류", "종류", "용도"],
  ownerCreditor: ["임대인·채권", "임대인", "소유자", "채권"],
  occupancy: ["점유 상태", "점유상태", "점유", "공실여부"],
  canOpen: ["개방가능", "개문", "개방"],
  merch: ["상품화준비", "상품화", "상품"],
  mail: ["우편", "우편물"],
  meter: ["계량기", "검침"],
  doorCode: ["현관비번", "현관", "비번", "비밀번호"],
  mgmtOffice: ["관리실"],
  memo: ["비고", "메모", "특이사항"],
};

export function mapHeaderToFields(header: string[]): Partial<Record<number, keyof SurveySheetRow>> {
  const map: Partial<Record<number, keyof SurveySheetRow>> = {};
  header.forEach((cell, idx) => {
    const norm = String(cell ?? "").replace(/\s/g, "");
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof SurveySheetRow, string[]][]) {
      if (aliases.some((a) => norm.includes(a.replace(/\s/g, "")))) { map[idx] = field; break; }
    }
  });
  return map;
}

function rowsFromMatrix(matrix: string[][]): { region: string | null; rows: SurveySheetRow[] } {
  // 헤더 행 = '사건번호'/'점유' 별칭을 포함한 첫 행. 그 앞 행 중 비어있지 않은 첫 칸 = 지역명.
  let headerIdx = -1;
  for (let i = 0; i < matrix.length; i++) {
    const joined = matrix[i].join("").replace(/\s/g, "");
    if (/사건번호|타경/.test(joined) && /(점유|물건종류|상세주소|주소)/.test(joined)) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { region: null, rows: [] };
  let region: string | null = null;
  for (let i = 0; i < headerIdx; i++) {
    const first = (matrix[i][0] ?? "").trim();
    if (first) { region = first; break; }
  }
  const fieldByIdx = mapHeaderToFields(matrix[headerIdx]);
  const rows: SurveySheetRow[] = [];
  const blank = (): SurveySheetRow => ({
    visitNo: null, dong: null, addressDetail: null, caseNumber: null, category: null,
    ownerCreditor: null, occupancy: null, canOpen: null, merch: null, mail: null,
    meter: null, doorCode: null, mgmtOffice: null, memo: null,
  });
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const cells = matrix[i];
    if (cells.every((c) => !String(c ?? "").trim())) continue;
    const r = blank();
    for (const [idxStr, field] of Object.entries(fieldByIdx)) {
      const v = cells[Number(idxStr)];
      r[field] = v != null && String(v).trim() ? String(v) : null;
    }
    if (!r.caseNumber && !r.addressDetail) continue; // 소계/빈행 skip
    rows.push(r);
  }
  return { region, rows };
}

export function extractRowsFromCsv(text: string): { region: string | null; rows: SurveySheetRow[] } {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const matrix = (parsed.data as string[][]).map((row) => row.map((c) => (c ?? "").toString()));
  return rowsFromMatrix(matrix);
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- src/lib/auction/survey-sheet.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auction/survey-sheet.ts src/lib/auction/survey-sheet.test.ts
git commit -m "feat(auction): 답사표 CSV 추출기(헤더 감지·지역명·멀티라인)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> **xlsx 입력:** 서버액션(Task 4)에서 `ExcelJS.Workbook().xlsx.load(buffer)` 로 시트를 읽어 `string[][]` matrix 로 변환 후 동일 `rowsFromMatrix`(export 해서 재사용)에 넘긴다. `rowsFromMatrix` 를 `export` 로 노출하도록 Step 3에 포함.

---

### Task 3: 사건번호 중복차단 보강 (마이그레이션 + 수집 액션 수정)

점유 O 가 재수집에서 새지 않도록 중복차단을 **사건번호 우선**으로 보강.

**Files:**
- Create: `supabase/migrations/027_auction_dedup_case_number.sql`
- Modify: `src/app/admin/(panel)/auction/collection/actions.ts:103-152`

**Interfaces:**
- Consumes: 기존 `importAuctionText` 내부 로직.
- Produces: 동작 변화만(시그니처 동일).

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- supabase/migrations/027_auction_dedup_case_number.sql
-- 사건번호 기준 재수집 중복차단 보조 인덱스(부분: rejected 아닌 활성행 조회 가속).
create index if not exists idx_auction_property_case_active
  on public.auction_property (case_number)
  where survey_status <> 'rejected';
```

- [ ] **Step 2: 마이그레이션 적용**

Run (MCP): `mcp__supabase__execute_sql` project_id `bojvtseiiimanillwzxg` 로 위 SQL 실행. (CLI 불가 환경)
Expected: 성공(인덱스 생성).

- [ ] **Step 3: 수집 액션 dedup 보강**

`collection/actions.ts` 의 중복차단 블록(현재 주소만)에서, 기존행 조회에 `case_number` 도 포함하고 **사건번호 매칭을 우선** 적용한다. `toImport` 의 각 건은 `p.caseNumber` 정규화 키로 먼저 검사, 없을 때만 주소로 검사.

```ts
// collection/actions.ts — 기존 행 조회 부분을 다음으로 교체
const caseNumsToCheck = Array.from(new Set(
  toImport.map((p) => (p.caseNumber || "").replace(/\s/g, "")).filter(Boolean),
));
const { data: existingByCase } = await supabase
  .from("auction_property")
  .select("case_number, survey_status")
  .in("case_number", caseNumsToCheck)
  .neq("survey_status", "rejected");
const existingStatusByCase = new Map<string, string>();
for (const r of (existingByCase ?? []) as { case_number: string; survey_status: string }[]) {
  const k = (r.case_number || "").replace(/\s/g, "");
  const prev = existingStatusByCase.get(k);
  if (!prev || (STATUS_RANK[r.survey_status] ?? 0) > (STATUS_RANK[prev] ?? 0)) {
    existingStatusByCase.set(k, r.survey_status);
  }
}
```

그리고 `dedupedImport` 필터에서 주소 검사 전에 사건번호 검사를 먼저:

```ts
const dedupedImport = toImport.filter((p) => {
  const cnum = (p.caseNumber || "").replace(/\s/g, "");
  const addr = (p.address || "(주소 미상)").trim();
  if (cnum && seenCaseInBatch.has(cnum)) { alreadyPending += 1; return false; }
  if (addr && seenInBatch.has(addr)) { alreadyPending += 1; return false; }
  if (cnum) seenCaseInBatch.add(cnum);
  seenInBatch.add(addr);
  const ex = (cnum && existingStatusByCase.get(cnum)) || existingStatusByAddr.get(addr);
  if (!ex) return true;
  if (ex === "vacant") alreadyVacant += 1;
  else if (ex === "occupied") alreadyOccupied += 1;
  else if (ex === "pending") alreadyPending += 1;
  else alreadyOtherSurveyed += 1;
  return false;
});
```

`const seenCaseInBatch = new Set<string>();` 를 `seenInBatch` 옆에 선언.

- [ ] **Step 4: 검증** — `npm run build` (타입 통과 확인). Expected: 빌드 성공. (단위테스트 대상 아님 — 통합 동작은 Task 6 에서 확인.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/027_auction_dedup_case_number.sql "src/app/admin/(panel)/auction/collection/actions.ts"
git commit -m "feat(auction): 재수집 중복차단 사건번호 우선 보강(점유 누수 방지)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 답사표 업로드 서버액션 `importSurveySheet`

파싱→사건번호 매칭→inspection 생성→상태전이 오케스트레이션.

**Files:**
- Create: `src/app/admin/(panel)/auction/survey/import-actions.ts`

**Interfaces:**
- Consumes: `extractRowsFromCsv`, `rowsFromMatrix`, `normalizeRow` (Task 1·2); `createServiceClient`, `requireAdmin`; `auction_survey_batch`/`auction_property`/`auction_inspection` 테이블; pipeline 전이는 본 액션 내부에서 `auction_property.pipeline_state` 직접 갱신 + `auction_pipeline_event` 기록(기존 `doTransition` 패턴 모방, 단 다중행 효율 위해 배치 처리).
- Produces:
  - `interface SurveyImportResult { ok: boolean; error?: string; region?: string; total: number; matched: number; created: number; vacant: number; occupied: number; recheck: number; skipped: number }`
  - `async function importSurveySheet(formData: FormData): Promise<SurveyImportResult>` (파일은 `formData.get("file") as File`)

- [ ] **Step 1: 구현**

```ts
"use server";
import "server-only";
import ExcelJS from "exceljs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { extractRowsFromCsv, rowsFromMatrix, normalizeRow, type SurveySheetRow } from "@/lib/auction/survey-sheet";

export interface SurveyImportResult {
  ok: boolean; error?: string; region?: string;
  total: number; matched: number; created: number;
  vacant: number; occupied: number; recheck: number; skipped: number;
}

async function extractFromFile(file: File): Promise<{ region: string | null; rows: SurveySheetRow[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    return extractRowsFromCsv(text);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => { cells.push(cell.text ?? ""); });
    matrix.push(cells);
  });
  return rowsFromMatrix(matrix);
}

// 점유 → 판정 액션 매핑 (Reviewing 이후 자동 판정)
const JUDGE_STATE: Record<string, string> = { vacant: "Approved", occupied: "OccupiedHold", recheck: "Recheck" };

export async function importSurveySheet(formData: FormData): Promise<SurveyImportResult> {
  const empty: SurveyImportResult = { ok: false, total: 0, matched: 0, created: 0, vacant: 0, occupied: 0, recheck: 0, skipped: 0 };
  try {
    const ctx = await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { ...empty, error: "파일이 없습니다." };
    if (file.size > 5_000_000) return { ...empty, error: "파일이 너무 큽니다(5MB 초과)." };

    const { region, rows } = await extractFromFile(file);
    if (rows.length === 0) return { ...empty, error: "답사표 행을 찾지 못했습니다. 헤더(사건번호·점유상태)를 확인하세요." };

    const supabase = createServiceClient();
    // 배치 생성
    const { data: batch } = await supabase.from("auction_survey_batch")
      .insert({ name: `${region ?? "답사표"} 업로드`, area: region, status: "imported", total_count: rows.length })
      .select("id").single();
    const batchId = (batch as { id: string } | null)?.id ?? null;

    const result = { ...empty, ok: true, region: region ?? undefined, total: rows.length };

    for (const raw of rows) {
      const n = normalizeRow(raw);
      if (!n.caseNumber || !n.occupancy) { result.skipped++; continue; }

      // 매칭(사건번호) — 없으면 신규 등록
      const { data: existing } = await supabase.from("auction_property")
        .select("id, pipeline_state").eq("case_number", n.caseNumber).maybeSingle();

      let propertyId: string;
      if (existing) {
        propertyId = (existing as { id: string }).id;
        await supabase.from("auction_property").update({
          door_code: n.doorCode, meter_check: n.meterCheck, survey_memo: n.memo,
          survey_status: n.occupancy, survey_date: new Date().toISOString().slice(0, 10),
          survey_by: ctx.admin.name, owner_name: n.ownerName ?? undefined,
          address_short: n.addressShort ?? undefined, sheet_id: batchId,
        }).eq("id", propertyId);
      } else {
        const { data: created } = await supabase.from("auction_property").insert({
          batch_id: batchId, sheet_id: batchId, case_number: n.caseNumber,
          address: n.address || "(주소 미상)", address_short: n.addressShort,
          owner_name: n.ownerName ?? "(소유자 미상)", creditor: n.creditor,
          creditor_type: n.creditorType, category: n.category,
          door_code: n.doorCode, meter_check: n.meterCheck, survey_memo: n.memo,
          survey_status: n.occupancy, survey_date: new Date().toISOString().slice(0, 10),
          survey_by: ctx.admin.name, survey_status_pending: null,
        }).select("id").single();
        propertyId = (created as { id: string }).id;
        result.created++;
      }
      if (existing) result.matched++;

      // 답사기록 + 판정 상태전이
      await supabase.from("auction_inspection").insert({
        auction_property_id: propertyId, inspector_name: ctx.admin.name,
        requested_by_id: ctx.user.id, requested_by_name: ctx.admin.name,
        occupancy: n.occupancy, mail_status: n.mail, can_open: n.canOpen,
        merchandising_ready: n.merch, comment: n.memo ?? "(엑셀 업로드)",
        status: "reviewed", submitted_at: new Date().toISOString(),
        reviewed_by_name: ctx.admin.name, reviewed_at: new Date().toISOString(),
      });

      // 공실+개문가능 → WorkPrep 자동점프, 그 외 JUDGE_STATE
      let nextState = JUDGE_STATE[n.occupancy];
      if (n.occupancy === "vacant" && n.canOpen === "possible") nextState = "WorkPrep";
      await supabase.from("auction_property")
        .update({ pipeline_state: nextState, pipeline_entered_at: new Date().toISOString() })
        .eq("id", propertyId);
      await supabase.from("auction_pipeline_event").insert({
        auction_property_id: propertyId, from_state: (existing as { pipeline_state?: string } | null)?.pipeline_state ?? "Collected",
        to_state: nextState, action: "IMPORT_SURVEY", performed_by_id: ctx.user.id,
        performed_by: ctx.admin.name, detail: `답사표 업로드(${region ?? "-"})`,
      });

      if (n.occupancy === "vacant") result.vacant++;
      else if (n.occupancy === "occupied") result.occupied++;
      else result.recheck++;
    }

    revalidatePath("/admin/auction/survey");
    revalidatePath("/admin/auction/pipeline");
    revalidatePath("/admin/auction/collection");
    return result;
  } catch (e) {
    if (e instanceof AppError) return { ...empty, error: e.message };
    return { ...empty, error: "업로드 처리 중 오류가 발생했습니다." };
  }
}
```

> 주의: `auction_inspection`/`auction_property` 의 실제 NOT NULL·체크 제약을 적용 전 `mcp__supabase__list_tables`(verbose) 로 확인하고, 필요 시 위 insert 필드를 맞춘다. `survey_status_pending` 같은 추정 컬럼은 실제 스키마에 없으면 제거.

- [ ] **Step 2: 타입/빌드 검증** — `npm run build`. Expected: 성공.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(panel)/auction/survey/import-actions.ts"
git commit -m "feat(auction): 답사표 업로드 서버액션(매칭·inspection·자동판정)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 답사표 내보내기 `survey-export.ts` + 다운로드 라우트

수집풀(Selected/Inspecting/지역)에서 식별칸을 채운 표준 답사표 .xlsx 생성.

**Files:**
- Create: `src/lib/auction/survey-export.ts`
- Create: `src/app/admin/(panel)/auction/pipeline/survey-template/route.ts`

**Interfaces:**
- Consumes: `createServiceClient`, ExcelJS.
- Produces: `async function buildSurveyTemplate(opts: { region?: string; states?: string[] }): Promise<{ buffer: Buffer; region: string }>`

- [ ] **Step 1: 구현 (export 유틸)** — building-export.ts 패턴 차용. 컬럼: 미리채움 `방문순번·동·상세주소·사건번호·물건종류·임대인·채권자`, 빈칸 `점유상태·개방가능·상품화준비·우편·계량기·현관비번·관리실·비고`. 점유상태/개방가능/상품화준비는 ExcelJS `dataValidation`(list) 드롭다운.

```ts
import "server-only";
import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";

export async function buildSurveyTemplate(opts: { region?: string; states?: string[] }): Promise<{ buffer: Buffer; region: string }> {
  const sb = createServiceClient();
  let q = sb.from("auction_property")
    .select("case_number, address, address_short, category, owner_name, creditor, pipeline_state")
    .neq("survey_status", "rejected")
    .order("address");
  if (opts.states?.length) q = q.in("pipeline_state", opts.states);
  const { data } = await q;
  const rows = (data ?? []) as { case_number: string; address: string; address_short: string | null; category: string | null; owner_name: string | null; creditor: string | null }[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "JNP주택관리 시스템";
  const ws = wb.addWorksheet(opts.region ?? "답사표");
  ws.columns = [
    { header: "방문순번", key: "no", width: 8 },
    { header: "동", key: "dong", width: 10 },
    { header: "상세 주소", key: "addr", width: 40 },
    { header: "사건번호", key: "case", width: 14 },
    { header: "물건종류", key: "cat", width: 12 },
    { header: "임대인", key: "owner", width: 12 },
    { header: "채권자", key: "creditor", width: 16 },
    { header: "점유 상태", key: "occ", width: 10 },
    { header: "개방가능", key: "open", width: 10 },
    { header: "상품화준비", key: "merch", width: 10 },
    { header: "우편", key: "mail", width: 6 },
    { header: "계량기", key: "meter", width: 6 },
    { header: "현관비번", key: "door", width: 10 },
    { header: "관리실", key: "office", width: 14 },
    { header: "비고", key: "memo", width: 30 },
  ];
  rows.forEach((r, i) => {
    ws.addRow({ no: i + 1, dong: "", addr: r.address_short ? `${r.address} [${r.address_short}]` : r.address,
      case: r.case_number, cat: r.category ?? "", owner: r.owner_name ?? "", creditor: r.creditor ?? "" });
  });
  // 헤더 스타일
  const h = ws.getRow(1);
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2B4A" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  // 드롭다운 (행 2~501)
  for (let r = 2; r <= rows.length + 1; r++) {
    ws.getCell(`H${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"O,X,△"'] };
    ws.getCell(`I${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,불가,관리실확인"'] };
    ws.getCell(`J${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,보류,불가"'] };
  }
  const out = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(out), region: opts.region ?? "답사표" };
}
```

- [ ] **Step 2: 다운로드 라우트**

```ts
// src/app/admin/(panel)/auction/pipeline/survey-template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { buildSurveyTemplate } from "@/lib/auction/survey-export";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const region = req.nextUrl.searchParams.get("region") ?? undefined;
  const states = req.nextUrl.searchParams.get("states")?.split(",").filter(Boolean);
  const { buffer, region: rg } = await buildSurveyTemplate({ region, states: states ?? ["Selected", "Inspecting"] });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="survey-${encodeURIComponent(rg)}.xlsx"`,
    },
  });
}
```

- [ ] **Step 3: 빌드 검증** — `npm run build`. Expected: 성공.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auction/survey-export.ts "src/app/admin/(panel)/auction/pipeline/survey-template/route.ts"
git commit -m "feat(auction): 표준 답사표 엑셀 내보내기(식별칸 prefilled+드롭다운)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 업로드 UI + 결과 요약 + 내보내기 버튼

**Files:**
- Create: `src/app/admin/(panel)/auction/survey/survey-upload.tsx`
- Modify: `src/app/admin/(panel)/auction/survey/page.tsx` (업로드 컴포넌트·내보내기 링크 삽입)

**Interfaces:**
- Consumes: `importSurveySheet` (Task 4), `/admin/auction/pipeline/survey-template` 라우트(Task 5).

- [ ] **Step 1: 업로드 클라이언트 컴포넌트** — `<input type=file accept=".csv,.xlsx">` + `importSurveySheet(formData)` 호출, 결과 요약(총·매칭·신규·공실·점유·재방문·skip) 표시. sonner `toast` 사용(프로젝트 기존 패턴). 버튼: "답사표 양식 다운로드"(GET 라우트 링크).

```tsx
"use client";
import { useState, useTransition } from "react";
import { importSurveySheet, type SurveyImportResult } from "./import-actions";
import { Button } from "@/components/ui/button";

export function SurveyUpload() {
  const [res, setRes] = useState<SurveyImportResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">답사표 업로드</h3>
        <a href="/admin/auction/pipeline/survey-template" className="text-sm text-primary underline">답사표 양식 다운로드</a>
      </div>
      <form action={(fd) => start(async () => setRes(await importSurveySheet(fd)))} className="flex items-center gap-2">
        <input type="file" name="file" accept=".csv,.xlsx" required className="text-sm" />
        <Button type="submit" disabled={pending}>{pending ? "처리중…" : "업로드"}</Button>
      </form>
      {res && (res.ok
        ? <p className="text-sm text-emerald-700">총 {res.total} · 공실 {res.vacant} · 점유 {res.occupied} · 재방문 {res.recheck} · 신규 {res.created} · 건너뜀 {res.skipped}</p>
        : <p className="text-sm text-rose-600">{res.error}</p>)}
    </div>
  );
}
```

- [ ] **Step 2: page.tsx 에 삽입** — survey 페이지 상단에 `<SurveyUpload />` 렌더(서버컴포넌트에서 client 컴포넌트 import).

- [ ] **Step 3: 빌드 검증** — `npm run build`. Expected: 성공.

- [ ] **Step 4: Commit**

```bash
git add "src/app/admin/(panel)/auction/survey/survey-upload.tsx" "src/app/admin/(panel)/auction/survey/page.tsx"
git commit -m "feat(auction): 답사표 업로드 UI + 양식 다운로드 버튼

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 시흥 55건 첫 실적재 + 검증

**Files:** (코드 변경 없음 — 운영 데이터 적재)

- [ ] **Step 1: 적재 전 카운트 스냅샷** — MCP `execute_sql`:
```sql
select count(*) from auction_property where survey_status='occupied';
```
값 기록.

- [ ] **Step 2: 업로드 실행** — 관리자 UI(`/admin/auction/survey`)에서 `C:\Users\style\OneDrive\Documents\카카오톡 받은 파일\5_6183887483214767171.csv` 업로드. 결과 요약 확인: 총 55, 공실/점유/재방문 분류.

- [ ] **Step 3: DB 검증** — MCP:
```sql
select survey_status, count(*) from auction_property
 where sheet_id = (select id from auction_survey_batch order by created_at desc limit 1)
 group by survey_status;
```
Expected: 시흥 행이 점유상태대로 vacant/occupied/recheck 분류, 합계 ≈ 55(헤더/소계 제외).

- [ ] **Step 4: 영구제외 확인** — 같은 사건번호로 `importAuctionText` 재수집 시 occupied 건이 `alreadyOccupied` 로 제외되는지 1건 스폿체크.

- [ ] **Step 5: 마무리** — 결과를 사용자에게 보고. (운영 적재라 commit 없음.)

---

## Self-Review

- **Spec coverage:** ①내보내기=Task5 ②업로드·매칭·자동판정=Task4 ③분류 X/O/△=Task1 ④영구제외 보강=Task3 ⑤지역배치=Task4(batch.area) ⑥시흥 첫적재=Task7. 누락 없음.
- **Placeholder scan:** 코드 스텝에 실제 코드 포함. Task4 의 스키마 확인 주의는 "실제 제약 확인 후 맞춤"으로 구체화(추정 컬럼 `survey_status_pending` 제거 지시 포함).
- **Type consistency:** `SurveySheetRow`·`NormalizedSurvey`·`SurveyImportResult` 시그니처가 Task 간 일치. `rowsFromMatrix` 는 Task2에서 export(Task4가 xlsx에서 재사용).
- **알려진 리스크:** `auction_inspection` 실제 NOT NULL/enum(특히 `mail_status`,`can_open`,`merchandising_ready`,`occupancy`,`status`)을 Task4 적용 전 `list_tables(verbose)` 로 검증할 것. `IMPORT_SURVEY` 는 `auction_pipeline_event.action` 자유텍스트면 OK, enum이면 기존 액션값 사용.

---

## Execution Handoff

(스킬 종료 시 실행 방식 선택 제시)
