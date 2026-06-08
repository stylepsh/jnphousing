/**
 * 경매/법무 사건관리(B) 단계 상수 + 표기 헬퍼.
 * 부동산위탁관리 status-codes.ts(AUCTION_STAGE)에서 이식.
 */

export const AUCTION_STAGE = {
  filed: "접수",
  appraised: "감정",
  scheduled: "기일지정",
  bidding: "입찰중",
  awarded: "낙찰",
  failed: "유찰",
  cancelled: "취소",
} as const;

export type AuctionStage = keyof typeof AUCTION_STAGE;

export const AUCTION_STAGE_ORDER: AuctionStage[] = [
  "filed",
  "appraised",
  "scheduled",
  "bidding",
  "awarded",
  "failed",
  "cancelled",
];

/** 단계별 배지 색 (Tailwind) */
export const AUCTION_STAGE_COLOR: Record<AuctionStage, string> = {
  filed: "bg-slate-100 text-slate-600",
  appraised: "bg-blue-100 text-blue-700",
  scheduled: "bg-yellow-100 text-yellow-700",
  bidding: "bg-orange-100 text-orange-700",
  awarded: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-500",
};

/** 사건유형 옵션 */
export const CASE_TYPES = [
  "임의경매",
  "강제경매",
  "공매",
  "소송",
  "가압류",
  "압류",
  "기타",
] as const;

/** 원 → "3억 5,000만원" 형식. 정수(원) 입력. */
export function formatWon(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "-";
  if (value >= 100_000_000) {
    const eok = Math.floor(value / 100_000_000);
    const man = Math.floor((value % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (value >= 10_000) {
    return `${Math.floor(value / 10_000).toLocaleString()}만원`;
  }
  return `${value.toLocaleString()}원`;
}

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "-";
  return AUCTION_STAGE[stage as AuctionStage] ?? stage;
}
