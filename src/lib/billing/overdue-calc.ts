/**
 * 연체 계산 (순수 함수).
 *
 * - invoice 가 due_date 이후 unpaid/partial 상태면 overdue 로 전이.
 * - overdue_interest = (amount_total - paid_total) × 연이율% × overdue_days / (100 × 365), floor.
 */

import { overdueInterest, asWon } from "@/lib/money";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { InvoiceStatus } from "@/types/lease";

export interface OverdueInput {
  due_date: Date | string;
  amount_total: number;
  paid_total: number;
  status: InvoiceStatus;
  annual_rate_percent: number;
  /** 현재 일자 (테스트 주입용). 기본 new Date(). */
  now?: Date;
}

export interface OverdueResult {
  is_overdue: boolean;
  overdue_days: number;
  outstanding: number;       // 미납 잔액
  overdue_interest: number;  // 누적 이자
  new_status: InvoiceStatus;
}

export function computeOverdue(input: OverdueInput): OverdueResult {
  const total = asWon(input.amount_total);
  const paid = asWon(input.paid_total);
  const outstanding = Math.max(0, total - paid);

  const now = startOfDay(input.now ?? new Date());
  const due = startOfDay(typeof input.due_date === "string" ? new Date(input.due_date) : input.due_date);

  // 이미 paid 또는 waived 면 연체 아님.
  if (input.status === "paid" || input.status === "waived") {
    return {
      is_overdue: false,
      overdue_days: 0,
      outstanding,
      overdue_interest: 0,
      new_status: input.status,
    };
  }

  const overdue_days = Math.max(0, differenceInCalendarDays(now, due));
  if (overdue_days === 0) {
    return {
      is_overdue: false,
      overdue_days: 0,
      outstanding,
      overdue_interest: 0,
      new_status: outstanding === 0 ? "paid" : input.status,
    };
  }

  const interest = overdueInterest(outstanding, overdue_days, input.annual_rate_percent);

  return {
    is_overdue: true,
    overdue_days,
    outstanding,
    overdue_interest: interest,
    new_status: outstanding === 0 ? "paid" : "overdue",
  };
}

/**
 * 알림 트리거 단계 결정.
 * - D+1, D+7, D+15, D+30 시점에 별도 알림 발송.
 * - lease_events 에 notice_sent 기록한 후 중복 발송 차단은 호출부 책임.
 */
export type OverdueNoticeStage = "d1" | "d7" | "d15" | "d30" | null;

export function overdueNoticeStage(overdueDays: number): OverdueNoticeStage {
  if (overdueDays === 30) return "d30";
  if (overdueDays === 15) return "d15";
  if (overdueDays === 7) return "d7";
  if (overdueDays === 1) return "d1";
  return null;
}
