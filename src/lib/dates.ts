/**
 * 날짜 유틸 — date-fns 기반, 한국 시간대(Asia/Seoul) 가정.
 *
 * 정책:
 * - 모든 due_date / period_start / period_end 는 calendar date (시간 무시).
 * - DB 의 date 컬럼은 'YYYY-MM-DD' 로 직렬화.
 */

import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isWeekend,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
} from "date-fns";

export const KST_OFFSET_HOURS = 9;

/** 'YYYY-MM-DD' 로 직렬화 (KST 가정). */
export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** 'YYYY-MM-DD' 파싱. */
export function fromIsoDate(s: string): Date {
  return startOfDay(parseISO(s));
}

/** 'YYYY.MM.DD' 표시용. */
export function formatKoreanDate(d: Date | string): string {
  const dt = typeof d === "string" ? fromIsoDate(d) : d;
  return format(dt, "yyyy.MM.dd");
}

/** 'YYYY.MM.DD (요일)'. */
export function formatKoreanDateWithDay(d: Date | string): string {
  const dt = typeof d === "string" ? fromIsoDate(d) : d;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${format(dt, "yyyy.MM.dd")} (${days[dt.getDay()]})`;
}

/* =========================================================================
 * 청구일 결정
 * 정책: 매월 rent_day (1-31). 해당 월에 그 일이 없으면 (예: 2월 31일) 말일로 보정.
 * ========================================================================= */

/**
 * 지정 월의 rent_day 를 실제 청구일로 변환.
 * 예: rent_day=31, 2월 → 28 또는 29.
 */
export function resolveDueDate(year: number, monthZeroIndexed: number, rentDay: number): Date {
  if (rentDay < 1 || rentDay > 31) {
    throw new Error(`resolveDueDate: rent_day 범위 1~31 (${rentDay})`);
  }
  const first = new Date(year, monthZeroIndexed, 1);
  const last = endOfMonth(first);
  const lastDay = last.getDate();
  const day = Math.min(rentDay, lastDay);
  return setDate(first, day);
}

/* =========================================================================
 * 영업일 (weekday) — 한국 공휴일은 외부 데이터 필요. 우선 주말만 처리.
 * TODO(성혁): 공휴일 데이터(예: holidays-kr) 도입 검토.
 * ========================================================================= */

/** 토/일 이전 영업일로 당김. 평일이면 그대로. */
export function previousBusinessDay(d: Date): Date {
  let cur = d;
  while (isWeekend(cur)) {
    cur = addDays(cur, -1);
  }
  return cur;
}

/** 토/일 다음 영업일로 미룸. 평일이면 그대로. */
export function nextBusinessDay(d: Date): Date {
  let cur = d;
  while (isWeekend(cur)) {
    cur = addDays(cur, 1);
  }
  return cur;
}

/* =========================================================================
 * 계약 기간
 * ========================================================================= */

export interface DateRange {
  start: Date;
  end: Date; // inclusive
}

/** 시작일로부터 months 개월 - 1일 후 종료 (한국 임대차 관행). */
export function leaseRangeFromMonths(start: Date, months: number): DateRange {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error(`leaseRangeFromMonths: months 양의 정수 (${months})`);
  }
  const end = addDays(addMonths(start, months), -1);
  return { start, end };
}

/** 같은 월 전체 범위. */
export function monthRange(d: Date): DateRange {
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

/** 만료 임박 여부 (현재 기준 days 이내). */
export function isExpiringSoon(endDate: Date, days: number, now: Date = new Date()): boolean {
  const threshold = addDays(startOfDay(now), days);
  return endDate <= threshold && endDate >= startOfDay(now);
}

/* =========================================================================
 * 사이클 (rent_cycle: monthly/weekly/daily) 이터레이션
 * ========================================================================= */

export type RentCycle = "monthly" | "weekly" | "daily";

/**
 * 계약 범위 안에서 rent_cycle 에 맞춰 due_date 시퀀스 생성.
 * monthly: 매월 rent_day (1~31, 말일 보정).
 * weekly: start_date 부터 매 7일.
 * daily: start_date 부터 매일.
 */
export function generateDueDates(
  range: DateRange,
  cycle: RentCycle,
  rentDay: number | null,
): Date[] {
  const out: Date[] = [];
  if (cycle === "monthly") {
    if (rentDay == null) throw new Error("generateDueDates: monthly 는 rent_day 필요");
    // 첫 청구일: range.start 의 같은 달 rent_day. start 이후가 아니면 다음 달.
    let cursor = resolveDueDate(range.start.getFullYear(), range.start.getMonth(), rentDay);
    if (cursor < range.start) {
      cursor = resolveDueDate(range.start.getFullYear(), range.start.getMonth() + 1, rentDay);
    }
    while (cursor <= range.end) {
      out.push(cursor);
      const next = addMonths(cursor, 1);
      cursor = resolveDueDate(next.getFullYear(), next.getMonth(), rentDay);
    }
    return out;
  }
  if (cycle === "weekly") {
    let cur = range.start;
    while (cur <= range.end) {
      out.push(cur);
      cur = addDays(cur, 7);
    }
    return out;
  }
  if (cycle === "daily") {
    let cur = range.start;
    while (cur <= range.end) {
      out.push(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }
  throw new Error(`generateDueDates: 알 수 없는 cycle ${cycle}`);
}
