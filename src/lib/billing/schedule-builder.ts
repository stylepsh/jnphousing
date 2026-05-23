/**
 * 청구 스케줄 빌더 (순수 함수, DB 미접근).
 *
 * 입력: 계약 정보 (rent_amount, management_fee, vat_included, rent_cycle, rent_day, start/end_date)
 * 출력: rent_schedules 에 삽입할 row 배열
 *
 * 로직:
 * - cycle 에 따라 due_date 시퀀스 생성 (generateDueDates).
 * - long_term 첫 달이 월 중간에 시작하면 첫 청구는 일할.
 * - 부가세 포함 계약은 amount_vat 분리, amount_total = rent + mgmt + vat.
 */

import { generateDueDates, fromIsoDate, monthRange, toIsoDate } from "@/lib/dates";
import { prorateRent, vatOf, asWon } from "@/lib/money";
import type { Lease, RentSchedule } from "@/types/lease";

export interface ScheduleRow {
  lease_id: string;
  due_date: string;          // 'YYYY-MM-DD'
  amount_rent: number;
  amount_management: number;
  amount_vat: number;
  amount_total: number;
  prorated: boolean;
}

export function buildSchedules(
  lease: Pick<
    Lease,
    | "id"
    | "lease_type"
    | "start_date"
    | "end_date"
    | "rent_amount"
    | "rent_cycle"
    | "rent_day"
    | "management_fee"
    | "vat_included"
  >,
): ScheduleRow[] {
  asWon(lease.rent_amount);
  asWon(lease.management_fee);

  const start = fromIsoDate(lease.start_date);
  const end = fromIsoDate(lease.end_date);

  const dues = generateDueDates(
    { start, end },
    lease.rent_cycle,
    lease.rent_cycle === "monthly" ? lease.rent_day : null,
  );

  const rows: ScheduleRow[] = [];

  for (let i = 0; i < dues.length; i++) {
    const due = dues[i];
    let rent = lease.rent_amount;
    let prorated = false;

    // long_term + monthly + 첫 회차 + 계약 시작일이 due_date 의 월 1일이 아니면 일할.
    if (
      lease.lease_type === "long_term"
      && lease.rent_cycle === "monthly"
      && i === 0
    ) {
      const dueMonthRange = monthRange(due);
      const monthStart = dueMonthRange.start;
      if (start > monthStart) {
        // 계약 시작일 ~ due_date 또는 월말 중 작은 쪽. 보통은 due_date 가 월말 직전 청구.
        // 정책: 첫 달 [start_date .. dueMonthRange.end] 까지 일할.
        rent = prorateRent(lease.rent_amount, monthStart, start, dueMonthRange.end);
        prorated = rent !== lease.rent_amount;
      }
    }

    const mgmt = lease.management_fee;
    const vat = lease.vat_included ? vatOf(rent + mgmt) : 0;
    const total = rent + mgmt + vat;

    rows.push({
      lease_id: lease.id,
      due_date: toIsoDate(due),
      amount_rent: rent,
      amount_management: mgmt,
      amount_vat: vat,
      amount_total: total,
      prorated,
    });
  }

  return rows;
}

/** RentSchedule row 와 ScheduleRow 간 변환 (DB ↔ 도메인). */
export function scheduleRowFromDb(s: RentSchedule): ScheduleRow {
  return {
    lease_id: s.lease_id,
    due_date: s.due_date,
    amount_rent: s.amount_rent,
    amount_management: s.amount_management,
    amount_vat: s.amount_vat,
    amount_total: s.amount_total,
    prorated: s.prorated,
  };
}
