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
