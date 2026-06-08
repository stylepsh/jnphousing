/**
 * 경매 파이프라인 상태머신 (부동산위탁관리 a-ope 이식).
 * jnp 독립 파이프라인: auction_property.pipeline_state 위에서 동작.
 *
 * 흐름: Collected→Selected→Inspecting→Reviewing→Approved→WorkPrep
 *       →Merchandising→Available→Leased / 분기: OccupiedHold, Recheck, Rejected
 */

export type PipelineState =
  | "Collected" // 수집됨
  | "Selected" // 답사선정
  | "Inspecting" // 답사중
  | "Reviewing" // 검토대기
  | "Approved" // 승인됨
  | "WorkPrep" // 상품화준비
  | "Merchandising" // 상품화진행
  | "Available" // 임대가능
  | "Leased" // 임대중
  | "OccupiedHold" // 거주중보관
  | "Recheck" // 재확인필요
  | "Rejected"; // 제외됨

export type PipelineAction =
  | "SELECT" // Collected → Selected
  | "ASSIGN_INSPECTION" // Selected/Recheck → Inspecting
  | "CANCEL_INSPECTION" // Inspecting → Selected
  | "SUBMIT_INSPECTION" // Inspecting → Reviewing
  | "APPROVE" // Reviewing → Approved (조건부 WorkPrep 자동점프)
  | "REQUEST_RECHECK" // Reviewing → Recheck
  | "MARK_OCCUPIED" // Reviewing → OccupiedHold
  | "REJECT" // any → Rejected
  | "RECHECK" // OccupiedHold/Recheck → Recheck
  | "START_WORK_PREP" // Approved → WorkPrep
  | "START_MERCHANDISING" // WorkPrep → Merchandising
  | "COMPLETE_MERCHANDISING" // Merchandising → Available
  | "CONTRACT_SIGNED" // Available → Leased
  | "WITHDRAW" // Available → Collected
  | "VACATE" // Leased → WorkPrep
  | "EXTEND" // Leased → Leased
  | "VACATED_NATURALLY" // Leased → WorkPrep (자동만료)
  | "RESTORE"; // Rejected → Collected

export const VALID_TRANSITIONS: Record<PipelineState, PipelineAction[]> = {
  Collected: ["SELECT", "REJECT"],
  Selected: ["ASSIGN_INSPECTION", "REJECT"],
  Inspecting: ["SUBMIT_INSPECTION", "CANCEL_INSPECTION"],
  Reviewing: ["APPROVE", "REQUEST_RECHECK", "MARK_OCCUPIED", "REJECT"],
  Approved: ["START_WORK_PREP", "RECHECK"],
  WorkPrep: ["START_MERCHANDISING"],
  Merchandising: ["COMPLETE_MERCHANDISING"],
  Available: ["CONTRACT_SIGNED", "WITHDRAW"],
  Leased: ["VACATE", "EXTEND", "VACATED_NATURALLY"],
  OccupiedHold: ["RECHECK", "REJECT", "VACATED_NATURALLY"],
  Recheck: ["ASSIGN_INSPECTION", "REJECT", "APPROVE"],
  Rejected: ["RESTORE"],
};

const ACTION_TARGET: Record<PipelineAction, PipelineState> = {
  SELECT: "Selected",
  ASSIGN_INSPECTION: "Inspecting",
  CANCEL_INSPECTION: "Selected",
  SUBMIT_INSPECTION: "Reviewing",
  APPROVE: "Approved",
  REQUEST_RECHECK: "Recheck",
  MARK_OCCUPIED: "OccupiedHold",
  REJECT: "Rejected",
  RECHECK: "Recheck",
  START_WORK_PREP: "WorkPrep",
  START_MERCHANDISING: "Merchandising",
  COMPLETE_MERCHANDISING: "Available",
  CONTRACT_SIGNED: "Leased",
  WITHDRAW: "Collected",
  VACATE: "WorkPrep",
  EXTEND: "Leased",
  VACATED_NATURALLY: "WorkPrep",
  RESTORE: "Collected",
};

export interface TransitionData {
  canOpen?: string; // "possible" 이면 개문 가능
  occupancy?: string; // "vacant" | "occupied" | "recheck"
}

export interface NextStateResult {
  ok: boolean;
  nextState?: PipelineState;
  logMessage?: string;
  error?: string;
}

/**
 * 전이 검증 + 다음 상태 계산.
 * a-ope 핵심 분기: Reviewing 에서 APPROVE 인데 공실+개문가능이면 WorkPrep 으로 자동 점프.
 */
export function getNextState(
  current: PipelineState,
  action: PipelineAction,
  data?: TransitionData,
): NextStateResult {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(action)) {
    return {
      ok: false,
      error: `'${STATE_LABELS[current] ?? current}' 상태에서 '${action}' 동작은 허용되지 않습니다.`,
    };
  }

  let nextState = ACTION_TARGET[action];

  if (
    action === "APPROVE" &&
    current === "Reviewing" &&
    data?.occupancy === "vacant" &&
    data?.canOpen === "possible"
  ) {
    nextState = "WorkPrep"; // 공실 + 개문가능 → 상품화준비로 자동 점프
  }

  return {
    ok: true,
    nextState,
    logMessage: `${STATE_LABELS[current] ?? current} → ${STATE_LABELS[nextState] ?? nextState}`,
  };
}

export const STATE_LABELS: Record<PipelineState, string> = {
  Collected: "수집됨",
  Selected: "답사선정",
  Inspecting: "답사중",
  Reviewing: "검토대기",
  Approved: "승인됨",
  WorkPrep: "상품화준비",
  Merchandising: "상품화진행",
  Available: "임대가능",
  Leased: "임대중",
  OccupiedHold: "거주중보관",
  Recheck: "재확인필요",
  Rejected: "제외됨",
};

export const STATE_COLORS: Record<PipelineState, string> = {
  Collected: "bg-slate-100 text-slate-600 border-slate-200",
  Selected: "bg-blue-50 text-blue-700 border-blue-200",
  Inspecting: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Reviewing: "bg-orange-50 text-orange-700 border-orange-200",
  Approved: "bg-cyan-50 text-cyan-700 border-cyan-200",
  WorkPrep: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Merchandising: "bg-amber-50 text-amber-700 border-amber-200",
  Available: "bg-teal-50 text-teal-700 border-teal-200",
  Leased: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OccupiedHold: "bg-purple-50 text-purple-700 border-purple-200",
  Recheck: "bg-rose-50 text-rose-700 border-rose-200",
  Rejected: "bg-slate-100 text-slate-400 border-slate-200 line-through",
};

/** 메인 흐름 순서 (대시보드 레이아웃) */
export const PIPELINE_ORDER: PipelineState[] = [
  "Collected",
  "Selected",
  "Inspecting",
  "Reviewing",
  "Approved",
  "WorkPrep",
  "Merchandising",
  "Available",
  "Leased",
];

/** 분기 상태 */
export const BRANCH_STATES: PipelineState[] = ["OccupiedHold", "Recheck", "Rejected"];

export const ACTION_LABELS: Record<PipelineAction, string> = {
  SELECT: "답사 선정",
  ASSIGN_INSPECTION: "답사 배정",
  CANCEL_INSPECTION: "답사 취소",
  SUBMIT_INSPECTION: "답사 제출",
  APPROVE: "승인",
  REQUEST_RECHECK: "재확인 요청",
  MARK_OCCUPIED: "점유중 표시",
  REJECT: "제외",
  RECHECK: "재확인",
  START_WORK_PREP: "상품화 준비 시작",
  START_MERCHANDISING: "상품화 진행",
  COMPLETE_MERCHANDISING: "상품화 완료(임대가능)",
  CONTRACT_SIGNED: "계약 체결",
  WITHDRAW: "수집으로 되돌림",
  VACATE: "퇴거(상품화로)",
  EXTEND: "계약 연장",
  VACATED_NATURALLY: "자동 만료",
  RESTORE: "복원",
};

export function stateLabel(s: string | null | undefined): string {
  if (!s) return "-";
  return STATE_LABELS[s as PipelineState] ?? s;
}
