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
}

export interface MonthlyPoint {
  period: string;   // "2026-08"
  charged: number;  // 청구
  paid: number;     // 입금
  unpaid: number;   // 미납
}

/** 계약의 현재 상태. 만료되면 그 물건은 다시 공실이 된다. */
export type ContractStatus = "예정" | "임대중" | "만료임박" | "만료(공실)" | "기간미상";

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

/** 시트를 행 배열(셀 값 2차원)로 받아 계약 목록으로 바꾼다. */
export function parseContracts(rows: unknown[][]): { contracts: RentalContract[]; warnings: string[] } {
  const contracts: RentalContract[] = [];
  const warnings: string[] = [];

  rows.forEach((r, i) => {
    const address = toText(r[2]);
    if (!address) return;               // 빈 행

    const agency = toText(r[0]);
    const monthlyRent = toWon(r[7]);
    const leaseStart = toIsoDate(r[8]);
    const leaseEnd = toIsoDate(r[9]);

    // 입력 실수를 조용히 넘기지 않는다 — 정산 숫자가 틀어지는 원인이 된다.
    const line = i + 3;                 // 시트상 실제 행 번호(헤더 2줄)
    if (!agency) warnings.push(`${line}행: 계약부동산이 비어 있습니다 (${address})`);
    if (monthlyRent <= 0) warnings.push(`${line}행: 월세가 0입니다 (${address})`);
    if (leaseStart && leaseEnd && leaseEnd < leaseStart) {
      warnings.push(`${line}행: 계약종료가 시작보다 빠릅니다 (${address})`);
    }

    const dueDayRaw = toWon(r[10]);
    contracts.push({
      agency,
      caseNumber: toText(r[1]),
      address,
      owner: toText(r[3]),
      tenant: toText(r[4]),
      deposit: toWon(r[6]),
      monthlyRent,
      leaseStart,
      leaseEnd,
      dueDay: dueDayRaw >= 1 && dueDayRaw <= 31 ? dueDayRaw : null,
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
  if (days < 0) return { status: "만료(공실)", daysLeft: days };
  if (days <= 30) return { status: "만료임박", daysLeft: days };
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
    if (!c.tenant) add("medium", "임차인이 비어 있습니다.");
    if (!c.leaseStart || !c.leaseEnd) add("medium", "계약기간이 비어 있어 월별 청구가 잡히지 않습니다.");
    if (c.leaseStart && c.leaseEnd && c.leaseEnd < c.leaseStart) {
      add("high", "계약종료가 시작보다 빠릅니다.");
    }
    if (c.dueDay == null) add("low", "임대료 납부일이 없습니다.");
    if (c.deposit <= 0) add("low", "보증금이 0원입니다.");

    // 보증금이 월세의 100배를 넘으면 단위를 잘못 적었을 가능성 (만원/원 혼용)
    if (c.monthlyRent > 0 && c.deposit > c.monthlyRent * 200) {
      add("medium", "보증금이 월세에 비해 지나치게 큽니다. 만원/원 단위를 확인하세요.");
    }
    if (c.monthlyRent > 0 && c.monthlyRent < 10_000) {
      add("medium", `월세가 ${c.monthlyRent}원입니다. 만원 단위로 적은 건 아닌지 확인하세요.`);
    }

    const { status, daysLeft } = contractStatus(c, today);
    if (status === "만료(공실)") {
      add("high", `계약이 ${-daysLeft}일 전 만료됐습니다. 공실로 돌아갔는지 확인하고 재임대 또는 갱신이 필요합니다.`);
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
  /** 우리 수익률(%) — 월세의 몇 %를 가져가는지. */
  feeRatePercent: number;
  /** 정산 기준: 실제 입금액(권장) 또는 청구액. */
  basis: "paid" | "charged";
  /** 회수해야 할 투입비(상품화 작업비 등). 없으면 0. */
  costToRecover?: number;
}

export interface SettlementResult {
  base: number;        // 정산 기준 금액
  fee: number;         // 우리 몫(수수료)
  ownerShare: number;  // 임대인 몫
  costRecovered: number;
  netToUs: number;     // 투입비 회수 후 우리에게 남는 금액
  remainingCost: number;
}

/**
 * 정산 계산.
 *
 * 미수금까지 우리 몫으로 잡으면 실제로 못 받은 돈을 수익으로 착각하게 되므로
 * 기본은 실제 입금액(paid) 기준이다.
 */
export function calcSettlement(summary: WorkbookSummary, input: SettlementInput): SettlementResult {
  const rate = Math.max(0, Math.min(100, input.feeRatePercent)) / 100;
  const base = input.basis === "charged" ? summary.totals.chargedSum : summary.totals.paidSum;
  const fee = Math.round(base * rate);
  const cost = Math.max(0, input.costToRecover ?? 0);
  const costRecovered = Math.min(cost, fee);

  return {
    base,
    fee,
    ownerShare: base - fee,
    costRecovered,
    netToUs: fee - costRecovered,
    remainingCost: cost - costRecovered,
  };
}
