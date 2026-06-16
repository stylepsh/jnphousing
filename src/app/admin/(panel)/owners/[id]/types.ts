// 소유주 상세 공용 타입 (NOT "use client") — page/탭/매니저가 공유

export interface OwnerUnit {
  id: string;
  label: string;
  unit_no: string | null;
  floor: number | null;
  modes: string[];
  occupied: boolean;
  deposit_default: number | null;
  rent_default: number | null;
}
export interface OwnerBuilding {
  id: string;
  name: string;
  address: string | null;
  type: string;
  modes: string[];
  deposit_default: number | null;
  rent_default: number | null;
  management_fee_default: number | null;
  vendor_count: number;
  units: OwnerUnit[];
}
export interface SettlementRow {
  period_start: string;
  period_end: string;
  base_amount: number;
  commission_amount: number;
  status: string;
}
export interface OwnerDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  account_bank: string | null;
  account_holder: string | null;
  account_masked: string;
  business_name: string | null;
  business_number: string | null;
  representative: string | null;
  memo: string | null;
}

/** 호실 지출 1건 (수익분배 포함) */
export interface OwnerExpense {
  id: string;
  unit_id: string;
  unit_label: string;       // 건물 · 호
  category: string;
  description: string | null;
  amount: number;
  incurred_on: string;      // yyyy-mm-dd
  split_type: string;       // shared | owner_all | company_all
  owner_ratio: number;
  company_ratio: number;
  owner_amount: number;     // 임대인 부담액
  company_amount: number;   // 회사 부담액
  billed_to_owner: boolean;
  memo: string | null;
}

/** 임대인별 이번 달 정산 파이프라인 */
export interface OwnerFinance {
  monthLabel: string;       // "2026-06"
  billed: number;           // 이번 달 청구 총액
  collected: number;        // 수금액
  outstanding: number;      // 미수금
  commission: number;       // 회사 위탁수수료(이번 달 정산 발생분)
  expenseTotal: number;     // 이번 달 지출 총액
  expenseOwner: number;     // 임대인 부담 지출
  expenseCompany: number;   // 회사 부담 지출
  ownerPayout: number;      // 임대인 지급 예정액 = 수금 - 수수료 - 임대인부담지출
}
