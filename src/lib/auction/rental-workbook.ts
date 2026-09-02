/**
 * 임대 취합 워크북(JNP_임대취합.xlsx) 파싱 + 정산 계산.
 *
 * scripts/build-rental-workbook.mjs 가 만든 양식을 그대로 읽는다.
 * 부동산이 몇 곳이든 `10_계약통합` 한 시트에 모여 있으므로 그것만 보면 된다.
 *
 * 파싱과 계산은 순수 함수로 두고, 파일 읽기는 서버 액션이 담당한다(테스트 가능하게).
 */

export interface RentalContract {
  agency: string;        // 계약 부동산
  caseNumber: string;
  address: string;
  owner: string;
  tenant: string;
  deposit: number;       // 원
  monthlyRent: number;   // 원
  leaseStart: string | null;  // YYYY-MM-DD
  leaseEnd: string | null;
  dueDay: number | null;      // 1~31
  /** "만료후 자동연장" 계약 — 종료일이 지나도 공실이 아니다. */
  autoRenew?: boolean;
  /** 계약조건 원문 (기간 추정에 사용) */
  terms?: string;
}

export interface MonthlyPoint {
  period: string;   // "2026-08"
  charged: number;  // 청구
  paid: number;     // 입금
  unpaid: number;   // 미납
}

/** 계약의 현재 상태. 만료되면 그 물건은 다시 공실이 된다. */
export type ContractStatus = "예정" | "임대중" | "만료임박" | "만료(공실)" | "자동연장" | "기간미상";

export interface ContractIssue {
  level: "high" | "medium" | "low";
  row: number;          // 10_계약통합 시트의 행 번호
  address: string;
  message: string;
}

export interface WorkbookSummary {
  contracts: RentalContract[];
  monthly: MonthlyPoint[];
  byAgency: { agency: string; count: number; monthlyRent: number; deposit: number }[];
  totals: {
    contractCount: number;
    monthlyRentSum: number;
    depositSum: number;
    chargedSum: number;
    paidSum: number;
    unpaidSum: number;
    collectionRate: number;   // 0~1. 청구가 0이면 0.
  };
  warnings: string[];
  issues: ContractIssue[];
  /** 계약 만료로 공실이 됐거나 곧 될 물건 */
  vacancySoon: { address: string; tenant: string; leaseEnd: string; status: ContractStatus; daysLeft: number }[];
  statusCount: Record<ContractStatus, number>;
}

/* ------------------------------------------------------------------ 유틸 */

/** 엑셀 셀 값 → 숫자(원). "1,200,000원", 빈칸, 수식결과 등을 견딘다. */
export function toWon(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "object" && v !== null && "result" in v) {
    return toWon((v as { result: unknown }).result);
  }
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** 엑셀 셀 값 → "YYYY-MM-DD" 또는 null. */
export function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    // 엑셀 날짜는 UTC 로 들어와 로컬 변환 시 하루 밀릴 수 있어 UTC 기준으로 뽑는다.
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "object" && v !== null && "result" in v) {
    return toIsoDate((v as { result: unknown }).result);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** 엑셀 셀 값 → 문자열. 수식 셀은 계산 결과를 쓴다. */
export function toText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && v !== null) {
    if ("result" in v) return toText((v as { result: unknown }).result);
    if ("text" in v) return String((v as { text: unknown }).text ?? "").trim();
    if ("richText" in v) {
      const rt = (v as { richText: { text: string }[] }).richText;
      return rt.map((r) => r.text).join("").trim();
    }
  }
  return String(v).trim();
}

/* ------------------------------------------------------------------ 파싱 */

/**
 * 월세를 원 단위로 맞춘다.
 *
 * 부동산이 "월세 70" "월세57" 처럼 만원 단위로 적어 보내는 일이 흔하다.
 * 그대로 합치면 월세 합계가 610원 같은 값이 되어 정산이 통째로 틀어진다.
 * 실무에서 월세가 1만원 미만인 경우는 없으므로, 1만 미만이면 만원 단위로 보고 곱한다.
 */
export function normalizeRentToWon(raw: number): { value: number; converted: boolean } {
  if (raw > 0 && raw < 10_000) return { value: raw * 10_000, converted: true };
  return { value: raw, converted: false };
}

/**
 * 보증금 보정 — 월세가 만원 단위였던 행에서만 같이 보정한다.
 *
 * 보증금만 보고 판단하면 안 된다. 실제 자료에 보증금 70만원짜리 계약이 있는데
 * "100만 미만이면 만원 단위" 같은 규칙을 쓰면 70만이 70억이 된다.
 * 같은 사람이 같은 표를 만원 단위로 적었는지가 유일하게 믿을 만한 신호다.
 */
export function normalizeDepositToWon(
  raw: number,
  rentWasManwon: boolean,
): { value: number; converted: boolean } {
  if (rentWasManwon && raw > 0 && raw < 100_000) return { value: raw * 10_000, converted: true };
  return { value: raw, converted: false };
}

/** "6개월 만료후 자동연장" 처럼 기간이 적힌 문구에서 개월 수를 뽑는다. */
export function monthsFromTerms(text: string): number | null {
  const m = text.match(/(\d+)\s*개월/);
  return m ? Number(m[1]) : null;
}

/** 시작일 + N개월 - 1일 = 종료일 (YYYY-MM-DD) */
export function addMonths(startIso: string, months: number): string {
  const [y, mo, d] = startIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1 + months, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/** 시트를 행 배열(셀 값 2차원)로 받아 계약 목록으로 바꾼다. */
export function parseContracts(rows: unknown[][]): { contracts: RentalContract[]; warnings: string[] } {
  const contracts: RentalContract[] = [];
  const warnings: string[] = [];

  rows.forEach((r, i) => {
    const address = toText(r[2]);
    if (!address) return;               // 빈 행

    const agency = toText(r[0]);
    const terms = toText(r[5]);
    const memo = toText(r[11 + 1] ?? "");
    const line = i + 3;                 // 시트상 실제 행 번호(헤더 2줄)

    // 만원 단위로 적어 보낸 값을 원으로 맞춘다. 바꾼 건 사용자에게 알린다.
    const rent = normalizeRentToWon(toWon(r[7]));
    const dep = normalizeDepositToWon(toWon(r[6]), rent.converted);
    if (rent.converted) {
      warnings.push(`${line}행: 월세를 만원 단위로 보고 ${rent.value.toLocaleString("ko-KR")}원으로 계산했습니다 (${address})`);
    }
    if (dep.converted) {
      warnings.push(`${line}행: 보증금을 만원 단위로 보고 ${dep.value.toLocaleString("ko-KR")}원으로 계산했습니다 (${address})`);
    }

    const leaseStart = toIsoDate(r[8]);
    let leaseEnd = toIsoDate(r[9]);
    let autoRenew = false;

    // "6개월 만료후 자동연장" 처럼 종료일 대신 기간만 적힌 경우 종료일을 계산한다.
    if (!leaseEnd && leaseStart) {
      const months = monthsFromTerms(terms) ?? monthsFromTerms(memo);
      if (months) {
        leaseEnd = addMonths(leaseStart, months);
        autoRenew = /자동\s*연장/.test(terms + memo);
      }
    }

    const dueDayRaw = toWon(r[10]);
    contracts.push({
      agency,
      caseNumber: toText(r[1]),
      address,
      owner: toText(r[3]),
      tenant: toText(r[4]),
      deposit: dep.value,
      monthlyRent: rent.value,
      leaseStart,
      leaseEnd,
      dueDay: dueDayRaw >= 1 && dueDayRaw <= 31 ? dueDayRaw : null,
      autoRenew,
      terms,
    });
  });

  return { contracts, warnings };
}

/**
 * 월별징수 시트 파싱.
 * 헤더는 "2026-08 청구 / 2026-08 입금 / 2026-08 미납" 이 3칸씩 반복된다.
 */
export function parseMonthly(header: unknown[], rows: unknown[][]): MonthlyPoint[] {
  const cols: { period: string; charge: number; paid: number }[] = [];
  header.forEach((h, idx) => {
    const m = toText(h).match(/^(\d{4}-\d{2})\s*청구$/);
    if (m) cols.push({ period: m[1], charge: idx, paid: idx + 1 });
  });

  return cols.map(({ period, charge, paid }) => {
    let charged = 0, paidSum = 0;
    for (const r of rows) {
      charged += toWon(r[charge]);
      paidSum += toWon(r[paid]);
    }
    return { period, charged, paid: paidSum, unpaid: Math.max(0, charged - paidSum) };
  });
}

/** 오늘 기준 계약 상태. 만료된 계약은 그 물건이 공실로 돌아갔다는 뜻이다. */
export function contractStatus(c: RentalContract, today = new Date()): { status: ContractStatus; daysLeft: number } {
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (!c.leaseEnd) {
    if (c.leaseStart && c.leaseStart > iso) return { status: "예정", daysLeft: 0 };
    return { status: "기간미상", daysLeft: 0 };
  }
  const days = Math.round(
    (Date.parse(c.leaseEnd + "T00:00:00Z") - Date.parse(iso + "T00:00:00Z")) / 86_400_000,
  );
  if (c.leaseStart && c.leaseStart > iso) return { status: "예정", daysLeft: days };
  // "만료후 자동연장" 계약은 종료일이 지나도 임대가 이어진다 — 공실로 보지 않는다.
  if (days < 0) return { status: c.autoRenew ? "자동연장" : "만료(공실)", daysLeft: days };
  // 자동연장이면 만료가 다가와도 굳이 알릴 필요가 없다.
  if (days <= 30 && !c.autoRenew) return { status: "만료임박", daysLeft: days };
  return { status: "임대중", daysLeft: days };
}

/**
 * 엑셀에서 잘못된 곳 찾기.
 *
 * 부동산 3곳이 각자 정리해 보낸 걸 옮겨 적다 보면 빠뜨리거나 겹쳐 적는 일이 생긴다.
 * 그대로 정산하면 숫자가 틀리므로, 올릴 때 바로 잡아준다.
 */
export function detectIssues(contracts: RentalContract[], today = new Date()): ContractIssue[] {
  const issues: ContractIssue[] = [];
  const seen = new Map<string, number>();

  contracts.forEach((c, i) => {
    const row = i + 3;
    const add = (level: ContractIssue["level"], message: string) =>
      issues.push({ level, row, address: c.address, message });

    // 같은 주소가 두 번 — 부동산 두 곳이 같은 물건을 계약했다고 적었을 수 있다
    const key = c.address.replace(/\s+/g, "");
    if (seen.has(key)) {
      add("high", `주소가 ${seen.get(key)}행과 중복입니다. 같은 물건을 두 곳이 계약했는지 확인하세요.`);
    } else {
      seen.set(key, row);
    }

    if (!c.agency) add("high", "계약부동산이 비어 있어 어느 곳 실적인지 알 수 없습니다.");
    if (c.monthlyRent <= 0) add("high", "월세가 0원입니다. 정산 금액이 실제보다 적게 잡힙니다.");
    // 실제 자료에는 임차인 대신 소유자만 적혀 오는 일이 많다 — 참고 수준으로 둔다.
    if (!c.tenant) add("low", "임차인이 비어 있습니다.");
    // 시작일조차 없으면 월별 청구가 아예 안 잡힌다(심각).
    // 종료일만 없는 건 "자동연장" 계약에서 정상이므로 참고로 낮춘다.
    if (!c.leaseStart) add("high", "계약 시작일이 없어 월별 청구가 잡히지 않습니다.");
    else if (!c.leaseEnd) add("low", "계약 종료일이 없습니다. 계약조건에 '6개월 자동연장' 처럼 기간을 적으면 자동 계산됩니다.");
    if (c.leaseStart && c.leaseEnd && c.leaseEnd < c.leaseStart) {
      add("high", "계약종료가 시작보다 빠릅니다.");
    }
    if (c.dueDay == null) add("low", "임대료 납부일이 없습니다.");
    if (c.deposit <= 0) add("low", "보증금이 비어 있습니다(월세만 받는 계약이면 무시).");

    // 보증금이 월세의 100배를 넘으면 단위를 잘못 적었을 가능성 (만원/원 혼용)
    if (c.monthlyRent > 0 && c.deposit > c.monthlyRent * 200) {
      add("medium", "보증금이 월세에 비해 지나치게 큽니다. 만원/원 단위를 확인하세요.");
    }
    // 보정 후에도 1만원 미만이면 진짜 이상값이다.
    if (c.monthlyRent > 0 && c.monthlyRent < 10_000) {
      add("high", `월세가 ${c.monthlyRent}원입니다. 값을 확인하세요.`);
    }

    const { status, daysLeft } = contractStatus(c, today);
    if (status === "만료(공실)") {
      add("high", `계약이 ${-daysLeft}일 전 만료됐습니다. 공실로 돌아갔는지 확인하고 재임대 또는 갱신이 필요합니다.`);
    } else if (status === "자동연장") {
      add("low", `최초 계약기간이 ${-daysLeft}일 전 끝나 자동연장 중입니다.`);
    } else if (status === "만료임박") {
      add("medium", `계약 만료까지 ${daysLeft}일 남았습니다. 갱신 여부를 확인하세요.`);
    }
  });

  const order = { high: 0, medium: 1, low: 2 } as const;
  return issues.sort((a, b) => order[a.level] - order[b.level] || a.row - b.row);
}

/** 계약 + 월별을 합쳐 요약을 만든다. */
export function summarize(
  contracts: RentalContract[],
  monthly: MonthlyPoint[],
  warnings: string[] = [],
  today = new Date(),
): WorkbookSummary {
  const byAgencyMap = new Map<string, { agency: string; count: number; monthlyRent: number; deposit: number }>();
  for (const c of contracts) {
    const key = c.agency || "(부동산 미기재)";
    const cur = byAgencyMap.get(key) ?? { agency: key, count: 0, monthlyRent: 0, deposit: 0 };
    cur.count += 1;
    cur.monthlyRent += c.monthlyRent;
    cur.deposit += c.deposit;
    byAgencyMap.set(key, cur);
  }

  const chargedSum = monthly.reduce((s, m) => s + m.charged, 0);
  const paidSum = monthly.reduce((s, m) => s + m.paid, 0);

  return {
    contracts,
    monthly,
    byAgency: [...byAgencyMap.values()].sort((a, b) => b.monthlyRent - a.monthlyRent),
    totals: {
      contractCount: contracts.length,
      monthlyRentSum: contracts.reduce((s, c) => s + c.monthlyRent, 0),
      depositSum: contracts.reduce((s, c) => s + c.deposit, 0),
      chargedSum,
      paidSum,
      unpaidSum: Math.max(0, chargedSum - paidSum),
      collectionRate: chargedSum > 0 ? paidSum / chargedSum : 0,
    },
    warnings,
    issues: detectIssues(contracts, today),
    vacancySoon: contracts
      .map((c) => ({ c, ...contractStatus(c, today) }))
      .filter((x) => x.status === "만료(공실)" || x.status === "만료임박")
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .map((x) => ({
        address: x.c.address,
        tenant: x.c.tenant,
        leaseEnd: x.c.leaseEnd ?? "",
        status: x.status,
        daysLeft: x.daysLeft,
      })),
    statusCount: contracts.reduce((acc, c) => {
      const { status } = contractStatus(c, today);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {} as Record<ContractStatus, number>),
  };
}

/* ------------------------------------------------------------------ 정산 */

export interface SettlementInput {
  /** 우리 수익 배분율(%). 반씩 나누면 50. */
  profitSharePercent: number;
  /** 정산 기준: 실제 입금액(권장) 또는 청구액. */
  basis: "paid" | "charged";
  /** 그 기간에 쓴 비용 — 문 개방비, 수리비 등. 수입에서 먼저 뺀다. */
  expenses?: number;
  /** 보증금 배분율(%). 절반씩 보유하면 50. 0이면 보증금은 정산에 넣지 않는다. */
  depositSharePercent?: number;
  /** 아직 회수 못한 상품화 투입비. 우리 몫에서 차감한다. */
  costToRecover?: number;
}

export interface SettlementResult {
  income: number;        // 월세 수입 (기준에 따라 입금액 또는 청구액)
  expenses: number;      // 지출
  netProfit: number;     // 수입 - 지출
  ourProfit: number;     // 순수익 × 배분율
  ownerProfit: number;   // 순수익 - 우리 몫
  depositTotal: number;
  ourDeposit: number;    // 보증금 × 배분율 (우리가 보유하는 몫)
  costRecovered: number;
  remainingCost: number;
  /** 우리가 최종적으로 가져가는 금액 = 우리 몫 + 보증금 보유분 - 투입비 회수 */
  total: number;
}

/**
 * 정산 계산.
 *
 * 실무 방식을 그대로 옮겼다.
 *   월세입금 − 지출비용 = 순수익 → 배분율만큼 우리 몫
 *   보증금도 배분율만큼 우리가 보유
 *   TOTAL = 우리 몫 + 보증금 보유분
 *
 * 미수금까지 수익으로 잡으면 못 받은 돈을 벌었다고 착각하게 되므로
 * 기본 기준은 실제 입금액이다.
 */
export function calcSettlement(summary: WorkbookSummary, input: SettlementInput): SettlementResult {
  const pct = (v: number) => Math.max(0, Math.min(100, v)) / 100;
  const profitRate = pct(input.profitSharePercent);
  const depositRate = pct(input.depositSharePercent ?? 0);

  const income = input.basis === "charged" ? summary.totals.chargedSum : summary.totals.paidSum;
  const expenses = Math.max(0, input.expenses ?? 0);
  const netProfit = income - expenses;                  // 적자면 음수 그대로 둔다

  const ourProfit = Math.round(netProfit * profitRate);
  const depositTotal = summary.totals.depositSum;
  const ourDeposit = Math.round(depositTotal * depositRate);

  const cost = Math.max(0, input.costToRecover ?? 0);
  const costRecovered = Math.min(cost, Math.max(0, ourProfit));

  return {
    income,
    expenses,
    netProfit,
    ourProfit,
    ownerProfit: netProfit - ourProfit,
    depositTotal,
    ourDeposit,
    costRecovered,
    remainingCost: cost - costRecovered,
    total: ourProfit - costRecovered + ourDeposit,
  };
}
