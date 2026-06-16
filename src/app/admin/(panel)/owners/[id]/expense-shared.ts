// 서버/클라 공용 (NOT "use server") — 지출 카테고리 + 분배 계산 순수 함수

export const EXPENSE_CATEGORIES = [
  { key: "wallpaper_floor", label: "도배·장판" },
  { key: "plumbing", label: "수도·배관" },
  { key: "waterproof", label: "방수·누수" },
  { key: "cleaning", label: "청소" },
  { key: "appliance", label: "가전·시설" },
  { key: "repair", label: "일반 수리" },
  { key: "etc", label: "기타" },
] as const;

export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.key) as [string, ...string[]];

/** 분배 계산 — split_type 과 임대인 부담비율(owner_ratio)로 임대인/회사 부담액 산출 */
export function computeExpenseSplit(amount: number, splitType: string, ownerRatio: number) {
  if (splitType === "owner_all") return { owner_ratio: 100, company_ratio: 0, owner_amount: amount, company_amount: 0 };
  if (splitType === "company_all") return { owner_ratio: 0, company_ratio: 100, owner_amount: 0, company_amount: amount };
  const or = Math.min(100, Math.max(0, ownerRatio));
  const ownerAmount = Math.floor((amount * or) / 100);
  return { owner_ratio: or, company_ratio: 100 - or, owner_amount: ownerAmount, company_amount: amount - ownerAmount };
}
