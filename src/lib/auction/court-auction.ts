/**
 * 경매 물건 텍스트 파서 + 보증채권자 분류
 *
 * 부동산위탁관리 앱(src/lib/integrations/court-auction.ts)에서 이식.
 * 순수 로직(외부 의존 없음) — 지지옥션/대법원 검색 결과 텍스트를 구조화.
 *
 * 핵심 요구:
 *   - 채권자가 주택도시보증공사(HUG) 또는 서울보증보험(SGI)인 건만 수집
 *   - 개인채권/은행/기타는 배제
 */

export interface ParsedAuctionCase {
  caseNumber: string; // 2024타경12345 / 2026-50501
  court?: string; // 서부6계
  address: string;
  addressShort?: string;
  category?: string; // 아파트, 다세대 등
  ownerName?: string;
  creditor?: string;
  appraisalValue?: number; // 감정가 (원)
  minimumBid?: number; // 최저가 (원)
  auctionDate?: string; // 매각기일 YYYY-MM-DD
  dividendDeadline?: string; // 배당종기일 YYYY-MM-DD
  rawText?: string;
}

// ============================================================
// 보증 채권자 분류
// ============================================================

export const HUG_CREDITOR_PATTERNS: RegExp[] = [
  /주택도시보증공사/,
  /주택보증공사/,
  /\bHUG\b/i,
];

export const SGI_CREDITOR_PATTERNS: RegExp[] = [
  /서울보증보험/,
  /SGI\s*서울보증/i,
  /\bSGI\b/i,
  /서울보증(?!공사)/, // "서울보증" 단독은 잡고 "주택보증공사"는 제외
];

export type CreditorType = "HUG" | "SGI" | "OTHER";

/** 채권자 문자열 분류. HUG > SGI > OTHER 우선순위. */
export function classifyCreditor(creditor: string | null | undefined): CreditorType {
  if (!creditor) return "OTHER";
  if (HUG_CREDITOR_PATTERNS.some((p) => p.test(creditor))) return "HUG";
  if (SGI_CREDITOR_PATTERNS.some((p) => p.test(creditor))) return "SGI";
  return "OTHER";
}

/** HUG 또는 SGI 인지 (수집 대상 채권자 여부) */
export function isTargetCreditor(creditor: string | null | undefined): boolean {
  return classifyCreditor(creditor) !== "OTHER";
}

// ============================================================
// 임대인(소유자) 이름 정규화 — "대성하우징(주)" / "(주)대성하우징" / "대성 하우징"
// 을 같은 임대인으로 묶기 위한 비교 키. 답사지 자동합치기 매칭에 사용.
// ============================================================

const COMPANY_TOKENS =
  /(주식회사|유한회사|합자회사|합명회사|유한책임회사|\(주\)|\(유\)|㈜|㈜|\(사\)|주식회사)/g;

/** 비교용 정규화 키: 회사 표기·괄호·공백 제거 후 소문자. 표기 흔들림 흡수. */
export function normalizeOwnerName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .replace(COMPANY_TOKENS, "")
    .replace(/[()\[\]<>·.,'"\s]/g, "")
    .toLowerCase()
    .trim();
}

/** ilike 후보 수집용 앵커 — 회사표기 제거 후 첫 토큰의 한글/영숫자만. */
export function ownerNameAnchor(name: string | null | undefined): string {
  if (!name) return "";
  const cleaned = name.replace(COMPANY_TOKENS, "").trim();
  const first = cleaned.split(/\s+/)[0] ?? "";
  return first.replace(/[^0-9a-zA-Z가-힣]/g, "");
}

/** 분류별 통계: { HUG: 30, SGI: 20, OTHER: 50 } */
export function countByCreditorType(
  parsed: ParsedAuctionCase[],
): Record<CreditorType, number> {
  const stats: Record<CreditorType, number> = { HUG: 0, SGI: 0, OTHER: 0 };
  for (const p of parsed) stats[classifyCreditor(p.creditor)]++;
  return stats;
}

/** 수집 대상(HUG + SGI)만 필터 */
export function filterTargetOnly(parsed: ParsedAuctionCase[]): ParsedAuctionCase[] {
  return parsed.filter((p) => isTargetCreditor(p.creditor));
}

// ============================================================
// 지지옥션(GGI) 형식 멀티라인 블록 파서
//
//   서부6계
//   2026-50501
//   [강제경매] 다세대(생활주택)
//   서울 은평구 갈현동 521-22 하나블루힐스 2층 202호 [갈원로21길 13-4]
//   채권자 : 주택도시보증공사 | 채무자 : 대성하우징 | 소유자 : 대성하우징
//   220,000,000
//   296,000,000
//   2026.04.30
//   2026.07.20
// ============================================================

// 사건번호: "2026-50501" (신형) 또는 "2024타경12345" (구형)
const CASE_NUMBER_PATTERNS: RegExp[] = [
  /\b(20\d{2}-\d{4,7})\b/,
  /\b(20\d{2}\s?타경\s?\d+)\b/,
];

// 법원/계: "서부6계", "인천20계"
const COURT_BRANCH_PATTERN = /([가-힣]{2,8}\d{1,3}계)/;

// 광역시/도 prefix (주소 시작 인식용)
const REGION_PREFIX =
  /^(서울|경기|부산|대구|인천|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)\s/;

function findCaseNumberInLine(line: string): string | null {
  for (const p of CASE_NUMBER_PATTERNS) {
    const m = line.match(p);
    if (m) return m[1].replace(/\s/g, "");
  }
  return null;
}

/** 한 블록(여러 줄)에서 한 물건의 모든 필드 추출 */
function parseOneBlock(lines: string[]): ParsedAuctionCase | null {
  const block: Partial<ParsedAuctionCase> = {};
  const rawText = lines.join("\n");

  for (const line of lines) {
    const cn = findCaseNumberInLine(line);
    if (cn) {
      block.caseNumber = cn;
      break;
    }
  }
  if (!block.caseNumber) return null;

  for (const line of lines) {
    const m = line.match(COURT_BRANCH_PATTERN);
    if (m) {
      block.court = m[1];
      break;
    }
  }

  // 카테고리: [강제경매] 다세대(생활주택) → 다세대(생활주택)
  for (const line of lines) {
    const m = line.match(
      /\[?(강제경매|임의경매|형식적경매)\]?\s*([가-힣A-Za-z]+(?:\([가-힣A-Za-z]+\))?)/,
    );
    if (m) {
      block.category = m[2];
      break;
    }
    const m2 = line.match(
      /^(다세대|아파트|연립|오피스텔|단독|다가구|상가|근린|토지|공장|빌라|콘도|기숙사)/,
    );
    if (m2) {
      block.category = m2[1];
      break;
    }
  }

  // 주소: REGION_PREFIX로 시작하는 가장 긴 줄
  let bestAddress = "";
  for (const line of lines) {
    if (REGION_PREFIX.test(line) && line.length > bestAddress.length) {
      bestAddress = line.trim();
    }
  }
  block.address = bestAddress;

  // 채권자 / 소유자
  for (const line of lines) {
    const creditorMatch = line.match(
      /채권자\s*[:：]?\s*([^|｜\s\t][^|｜\t]*?)(?=\s*[|｜]|$|채무자|소유자)/,
    );
    if (creditorMatch) block.creditor = creditorMatch[1].trim();

    const ownerMatch = line.match(
      /소유자\s*[:：]?\s*([^|｜\s\t][^|｜\t]*?)(?=\s*[|｜]|$|채권자|채무자)/,
    );
    if (ownerMatch) block.ownerName = ownerMatch[1].trim();
  }

  // 라벨 없이 HUG/SGI 키워드만 있어도 채권자로 인식
  if (!block.creditor) {
    const allPatterns = [...HUG_CREDITOR_PATTERNS, ...SGI_CREDITOR_PATTERNS];
    for (const line of lines) {
      for (const p of allPatterns) {
        const m = line.match(p);
        if (m) {
          block.creditor = m[0];
          break;
        }
      }
      if (block.creditor) break;
    }
  }

  // 금액: 큰 두 개를 감정가/최저가로 추정
  const priceMatches = Array.from(rawText.matchAll(/(\d{1,3}(?:,\d{3}){2,})/g))
    .map((m) => parseInt(m[1].replace(/[^\d]/g, ""), 10))
    .filter((n) => !isNaN(n) && n >= 1_000_000)
    .sort((a, b) => b - a);
  block.appraisalValue = priceMatches[0];
  block.minimumBid = priceMatches[1];

  // 날짜 2개: 매각기일 = 빠른 날짜, 배당종기일 = 늦은 날짜
  const dateMatches = Array.from(
    rawText.matchAll(/20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2}/g),
  )
    .map((m) => m[0].replace(/[./]/g, "-"))
    .sort();
  if (dateMatches.length >= 1) block.auctionDate = dateMatches[0];
  if (dateMatches.length >= 2) {
    block.dividendDeadline = dateMatches[dateMatches.length - 1];
  }

  block.rawText = rawText;
  return block as ParsedAuctionCase;
}

/**
 * 모바일 줄바꿈 보정 — 줄바꿈 누락 시 사건번호/법원·계 패턴 앞에 강제 삽입.
 */
function normalizeMobileText(raw: string): string {
  let t = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/([^\n])(\d{4}-\d{4,})/g, "$1\n$2");
  t = t.replace(/([^\n])([가-힣]+\d+계)/g, "$1\n$2");
  t = t.replace(/\t/g, "\n");
  return t;
}

/**
 * 지지옥션 형식 텍스트 → 물건 배열.
 * 사건번호 줄을 만나면 새 블록 시작(직전 줄이 법원/계면 함께 포함).
 */
export function parseAuctionPasteText(text: string): ParsedAuctionCase[] {
  const normalized = normalizeMobileText(text);
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const blocks: string[][] = [];
  let current: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (findCaseNumberInLine(line)) {
      const courtBefore =
        current.length > 0 &&
        COURT_BRANCH_PATTERN.test(current[current.length - 1])
          ? current[current.length - 1]
          : null;

      if (current.length > 0) {
        if (courtBefore) blocks.push(current.slice(0, -1));
        else blocks.push(current);
      }

      current = courtBefore ? [courtBefore, line] : [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  const results: ParsedAuctionCase[] = [];
  for (const block of blocks) {
    const parsed = parseOneBlock(block);
    if (parsed) results.push(parsed);
  }
  return results;
}

/**
 * 화면 표시용 임대인명 정리.
 * 지지옥션 원문에 "김정홍 / 이수영"(공동소유) 처럼 구분자가 섞여 들어와
 * "김정홍 /" 같은 꼬리가 남는 경우가 있다. 데이터는 건드리지 않고 표기만 정돈.
 */
export function displayOwnerName(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  if (!raw) return "(소유자 미상)";
  // 끝에 남은 구분자(/ , · 외) 제거
  const cleaned = raw.replace(/[\s/,·]+(외\s*\d*명?)?[\s/,·]*$/u, "").trim();
  return cleaned || raw;
}
