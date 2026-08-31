/**
 * 경매 물건 텍스트 파서 + 보증채권자 분류
 *
 * 부동산위탁관리 앱(src/lib/integrations/court-auction.ts)에서 이식.
 * 순수 로직(외부 의존 없음) — 지지옥션/대법원 검색 결과 텍스트를 구조화.
 *
 * 핵심 요구:
 *   - 채권자 또는 신청자가 주택도시보증공사(HUG) 또는 서울보증보험(SGI)인 건만 수집
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
  applicant?: string; // 신청자 / 신청채권자 / 경매신청자
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

/**
 * 경매 사건의 채권자와 신청자를 함께 분류한다.
 * 어느 한쪽에라도 HUG가 있으면 HUG, 그다음 SGI, 나머지는 OTHER다.
 */
export function classifyAuctionCase(
  auctionCase: Pick<ParsedAuctionCase, "creditor" | "applicant">,
): CreditorType {
  const creditorType = classifyCreditor(auctionCase.creditor);
  const applicantType = classifyCreditor(auctionCase.applicant);

  if (creditorType === "HUG" || applicantType === "HUG") return "HUG";
  if (creditorType === "SGI" || applicantType === "SGI") return "SGI";
  return "OTHER";
}

/** 채권자 또는 신청자가 HUG/SGI인지 여부 */
export function isTargetAuctionCase(
  auctionCase: Pick<ParsedAuctionCase, "creditor" | "applicant">,
): boolean {
  return classifyAuctionCase(auctionCase) !== "OTHER";
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

/** 사건 내 복수 물건을 구분할 때 사용하는 주소 비교 키. */
export function normalizeAuctionAddress(address: string | null | undefined): string {
  if (!address) return "";
  return address
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "");
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
  for (const p of parsed) stats[classifyAuctionCase(p)]++;
  return stats;
}

/** 수집 대상(HUG + SGI)만 필터 */
export function filterTargetOnly(parsed: ParsedAuctionCase[]): ParsedAuctionCase[] {
  return parsed.filter(isTargetAuctionCase);
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

const PARTY_LABEL_PATTERN =
  /(?:^|[|｜¦]|\s)(경매신청자|신청채권자|신청자|채권자|채무자|소유자)\s*(?:[:：﹕]\s*)?/gu;
const PARTY_SEPARATOR_PATTERN = /[|｜¦]/u;

interface ParsedPartyFields {
  creditor?: string;
  applicant?: string;
  ownerName?: string;
  hasPartyLabel: boolean;
}

/**
 * 한 줄 안의 당사자 필드를 순서와 구분자 종류에 관계없이 추출한다.
 * 라벨은 긴 표기부터 매칭해 "경매신청자"가 "신청자"로 잘리는 것을 막는다.
 */
function parsePartyFields(line: string): ParsedPartyFields {
  const matches = Array.from(line.matchAll(PARTY_LABEL_PATTERN));
  const parsed: ParsedPartyFields = { hasPartyLabel: matches.length > 0 };

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const label = match[1];
    const valueStart = (match.index ?? 0) + match[0].length;
    const nextLabelStart = matches[i + 1]?.index ?? line.length;
    const remaining = line.slice(valueStart, nextLabelStart);
    const separatorIndex = remaining.search(PARTY_SEPARATOR_PATTERN);
    const value = (separatorIndex >= 0 ? remaining.slice(0, separatorIndex) : remaining).trim();
    if (!value) continue;

    if (label === "채권자") parsed.creditor = value;
    else if (label === "소유자") parsed.ownerName = value;
    else if (
      label === "신청자" ||
      label === "신청채권자" ||
      label === "경매신청자"
    ) {
      parsed.applicant = value;
    }
  }

  return parsed;
}

function findCaseNumberInLine(line: string): string | null {
  for (const p of CASE_NUMBER_PATTERNS) {
    const m = line.match(p);
    if (m) return m[1].replace(/\s/g, "");
  }
  return null;
}

function parseWon(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const amount = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : undefined;
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

  // 채권자 / 신청자 / 소유자
  for (const line of lines) {
    const parties = parsePartyFields(line);
    if (parties.creditor) block.creditor = parties.creditor;
    if (parties.applicant) block.applicant = parties.applicant;
    if (parties.ownerName) block.ownerName = parties.ownerName;
  }

  // 라벨 없이 HUG/SGI 키워드만 있어도 채권자로 인식
  if (!block.creditor) {
    const allPatterns = [...HUG_CREDITOR_PATTERNS, ...SGI_CREDITOR_PATTERNS];
    for (const line of lines) {
      // 신청자/소유자/채무자를 채권자로 잘못 복제하지 않는다.
      if (parsePartyFields(line).hasPartyLabel) continue;
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

  // 금액: 라벨이 있으면 라벨을 우선하고, 구형 무라벨 형식만 큰 두 금액으로 보정한다.
  const appraisalLabeled = rawText.match(
    /(?:감정가|감정평가액)\s*[:：﹕]?\s*(\d{1,3}(?:,\d{3})+)/u,
  );
  const minimumLabeled = rawText.match(
    /(?:최저가|최저매각가격|최저입찰가)\s*[:：﹕]?\s*(\d{1,3}(?:,\d{3})+)/u,
  );
  const priceMatches = Array.from(rawText.matchAll(/(\d{1,3}(?:,\d{3}){2,})/g))
    .map((m) => parseInt(m[1].replace(/[^\d]/g, ""), 10))
    .filter((n) => !isNaN(n) && n >= 1_000_000)
    .sort((a, b) => b - a);
  block.appraisalValue = parseWon(appraisalLabeled?.[1]) ?? priceMatches[0];
  block.minimumBid = parseWon(minimumLabeled?.[1]) ?? priceMatches[1];

  // 날짜: 라벨을 우선한다. 지지옥션 구형 무라벨 형식은 화면 출력 순서
  // (매각기일, 배당종기일)를 보존하며 문자열 정렬로 날짜를 추측하지 않는다.
  const dateToken = "(20\\d{2}[.\\-/]\\d{1,2}[.\\-/]\\d{1,2})";
  const auctionLabeled = rawText.match(
    new RegExp(`(?:매각기일|입찰일|경매일)\\s*[:：﹕]?\\s*${dateToken}`, "u"),
  );
  const dividendLabeled = rawText.match(
    new RegExp(`(?:배당요구종기일?|배당종기일?)\\s*[:：﹕]?\\s*${dateToken}`, "u"),
  );
  const dateMatches = Array.from(
    rawText.matchAll(/20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2}/g),
  )
    .map((m) => normalizeDate(m[0]))
    .filter((value): value is string => Boolean(value));
  block.auctionDate = normalizeDate(auctionLabeled?.[1]) ?? dateMatches[0];
  block.dividendDeadline = normalizeDate(dividendLabeled?.[1]) ?? dateMatches[1];

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
