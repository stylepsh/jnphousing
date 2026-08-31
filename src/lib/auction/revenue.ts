/**
 * 경매 임대 수익 계산 — 현장팀 투입비 회수 → 순이익 배분.
 *
 * 구조(2026-08-31 확정):
 *   1) 상품화 비용(인테리어·열쇠개문·공실관리비·부동산 중개수수료)은 현장팀이 전액 지급
 *   2) 월세에서 받는 관리수수료로 현장팀 투입비를 **먼저 전액 회수**
 *   3) 회수 완료 후부터 남는 순이익을 배분율대로 나눔
 *
 * 금액은 모두 원(정수). 외부 의존 없음(순수 함수).
 */

/** 물건 1건의 회수·배분 현황 */
export interface RecoveryInput {
  /** 현장팀이 지급한 투입비 합계(원) */
  fieldTeamCost: number;
  /** 지금까지 발생한 관리수수료 수입 누계(원) */
  cumulativeIncome: number;
  /** 월 관리수수료(원) — 남은 개월 추정용 */
  monthlyFee: number;
  /** 현장팀 순이익 배분율(%) */
  shareRate: number;
}

export interface RecoveryResult {
  /** 회수된 금액 */
  recovered: number;
  /** 남은 미회수 금액 */
  remaining: number;
  /** 회수율 0~100 */
  recoveryRate: number;
  /** 회수 완료 여부 */
  recoveredDone: boolean;
  /** 회수 후 배분 가능한 누적 순이익 */
  distributable: number;
  /** 현장팀 몫 */
  fieldTeamShare: number;
  /** 회사 몫 */
  companyShare: number;
  /** 남은 회수까지 예상 개월수 (완료면 0, 월수입 0이면 null) */
  monthsToRecover: number | null;
}

const won = (n: number) => Math.max(0, Math.round(n || 0));
const pct = (n: number) => Math.min(100, Math.max(0, n || 0));

export function calcRecovery(input: RecoveryInput): RecoveryResult {
  const cost = won(input.fieldTeamCost);
  const income = won(input.cumulativeIncome);
  const monthly = won(input.monthlyFee);
  const rate = pct(input.shareRate);

  const recovered = Math.min(income, cost);
  const remaining = cost - recovered;
  const recoveryRate = cost === 0 ? 100 : Math.round((recovered / cost) * 100);
  const distributable = Math.max(0, income - cost);
  const fieldTeamShare = Math.round(distributable * (rate / 100));

  return {
    recovered,
    remaining,
    recoveryRate,
    recoveredDone: remaining === 0,
    distributable,
    fieldTeamShare,
    companyShare: distributable - fieldTeamShare,
    monthsToRecover: remaining === 0 ? 0 : monthly > 0 ? Math.ceil(remaining / monthly) : null,
  };
}

/** 월 관리수수료 = 월세 × 수수료율 */
export function monthlyFeeOf(monthlyRent: number | null, feeRate: number | null): number {
  return Math.round(won(monthlyRent ?? 0) * (pct(feeRate ?? 0) / 100));
}

/**
 * 계약 시작일 ~ 기준월까지 발생한 수수료 누계.
 * 실제 수납 기록이 있으면 그쪽이 정확하므로, 이 함수는 기록이 없을 때의 추정치.
 */
export function estimateCumulativeIncome(
  leaseStart: string | null,
  monthlyFee: number,
  today = new Date(),
): number {
  if (!leaseStart) return 0;
  const start = new Date(leaseStart);
  if (Number.isNaN(start.getTime())) return 0;
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) + 1;
  return months > 0 ? won(monthlyFee) * months : 0;
}

/** 기준일까지 남은 일수 (음수면 이미 지남) */
export function daysUntil(dateStr: string | null, today = new Date()): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86_400_000);
}

export type LeaseAlert = "expired" | "d30" | "d60" | "none";

/** 만기 알림 단계 */
export function leaseAlertOf(leaseEnd: string | null, today = new Date()): LeaseAlert {
  const d = daysUntil(leaseEnd, today);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 30) return "d30";
  if (d <= 60) return "d60";
  return "none";
}

/** 'YYYY-MM' 기간 문자열 */
export function periodOf(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** 그 달의 수금 예정일 — 말일 보정(31일 지정인데 2월이면 28/29일) */
export function dueDateOf(period: string, dueDay: number | null): string | null {
  if (!dueDay) return null;
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return null;
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(Math.max(1, dueDay), lastDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 연체 일수 (미납이고 예정일이 지났을 때만 양수) */
export function overdueDays(dueDate: string | null, received: number, today = new Date()): number {
  if (received > 0 || !dueDate) return 0;
  const d = daysUntil(dueDate, today);
  return d !== null && d < 0 ? -d : 0;
}
