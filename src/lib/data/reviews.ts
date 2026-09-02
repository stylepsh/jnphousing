/**
 * 공개 고객 후기 데이터.
 *
 * 원문 확인과 게재 동의가 모두 끝난 후기만 PUBLIC_REVIEWS에 포함됩니다.
 * 확인 전 예시 문구나 가상 성과 수치는 공개 페이지에 사용하지 않습니다.
 */

export interface Review {
  id: string;
  authorAlias: string;
  authorRole: "tenant" | "landlord" | "agency";
  authorRoleLabel: string;
  buildingHint?: string;
  rating: number;
  title: string;
  body: string;
  sourceConfirmed: boolean;
  consentConfirmed: boolean;
  createdAt: string;
}

/**
 * 실제 후기를 등록할 때 아래 배열에 추가합니다.
 * 개인정보를 가린 별칭만 사용하고, 원문 및 게재 동의를 내부에서 확인한 뒤
 * sourceConfirmed와 consentConfirmed를 true로 설정합니다.
 */
const REVIEW_CANDIDATES: Review[] = [];

export const PUBLIC_REVIEWS = REVIEW_CANDIDATES.filter(
  (review) => review.sourceConfirmed && review.consentConfirmed,
);

export function averageRating(reviews: Review[] = PUBLIC_REVIEWS): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}
