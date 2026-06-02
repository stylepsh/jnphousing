// 소유주 상세 공용 타입 (NOT "use client") — page/탭/매니저가 공유

export interface OwnerUnit {
  id: string;
  label: string;
  floor: number | null;
  modes: string[];
  occupied: boolean;
}
export interface OwnerBuilding {
  id: string;
  name: string;
  address: string | null;
  modes: string[];
  units: OwnerUnit[];
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
