/**
 * 계약/월세/위탁수수료 (Phase 2) — DB 스키마 대응 타입.
 * supabase/migrations/002_lease_and_billing.sql 과 동기화 유지.
 *
 * 금액은 모두 number (원, integer 의미).
 * 비율은 number (numeric(5,2), 0.00~999.99).
 */

export type LeaseType = "long_term" | "short_term";
export type LeaseStatus = "draft" | "active" | "expiring" | "renewed" | "terminated" | "expired";
export type RentCycle = "monthly" | "weekly" | "daily";
export type FeeType = "percent" | "fixed";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue" | "waived";
export type PaymentSource = "manual" | "bank_csv" | "virtual_account";
export type PartyType = "landlord" | "tenant" | "co_tenant" | "guarantor";
export type CommissionStatus = "pending" | "paid" | "waived";
export type NotifyChannel = "kakao" | "sms" | "email" | "push" | "console";
export type NotifyStatus = "queued" | "sent" | "failed" | "skipped";

export type LeaseEventType =
  | "created"
  | "activated"
  | "renewed"
  | "terminated"
  | "expired"
  | "notice_sent"
  | "overdue"
  | "payment_received"
  | "schedule_generated"
  | "invoice_issued"
  | "commission_generated";

export interface Landlord {
  id: string;
  name: string;
  phone: string;
  account_holder: string | null;
  account_bank: string | null;
  account_number_encrypted: string | null;
  business_number_encrypted: string | null;
  email: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyUnit {
  id: string;
  property_id: string;
  unit_no: string;
  dong: string | null;
  ho: string | null;
  floor: number | null;
  area_m2: number | null;
  area_pyeong: number | null;
  room_count: number | null;
  bathroom_count: number | null;
  deposit_default: number;
  rent_default: number;
  management_fee_default: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  phone_last4: string;          // generated column
  emergency_contact: string | null;
  id_number_encrypted: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  prev_lease_id: string | null;
  lease_type: LeaseType;
  unit_id: string;
  landlord_id: string;
  tenant_id: string;
  status: LeaseStatus;
  start_date: string;
  end_date: string;
  deposit: number;
  rent_amount: number;
  rent_cycle: RentCycle;
  rent_day: number | null;
  management_fee: number;
  vat_included: boolean;
  fee_type: FeeType;
  fee_percent: number | null;
  fee_fixed: number | null;
  overdue_annual_rate: number;
  special_terms: string | null;
  contract_file_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseParty {
  id: string;
  lease_id: string;
  party_type: PartyType;
  party_id: string;
  note: string | null;
  created_at: string;
}

export interface RentSchedule {
  id: string;
  lease_id: string;
  due_date: string;
  amount_rent: number;
  amount_management: number;
  amount_vat: number;
  amount_total: number;
  prorated: boolean;
  generated_at: string;
}

export interface RentInvoice {
  id: string;
  schedule_id: string;
  lease_id: string;
  issued_at: string;
  due_date: string;
  amount_total: number;
  paid_total: number;
  status: InvoiceStatus;
  overdue_days: number;
  overdue_interest: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentPayment {
  id: string;
  invoice_id: string;
  paid_at: string;
  amount: number;
  source: PaymentSource;
  memo: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface AgencyCommission {
  id: string;
  lease_id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  commission_amount: number;
  status: CommissionStatus;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseEvent {
  id: string;
  lease_id: string;
  event_type: LeaseEventType;
  event_date: string;
  payload: Record<string, unknown>;
  created_by: string | null;
}

export interface NotificationLog {
  id: string;
  channel: NotifyChannel;
  recipient: string;
  template_key: string;
  payload: Record<string, unknown>;
  sent_at: string | null;
  status: NotifyStatus;
  error_message: string | null;
  related_lease_id: string | null;
  related_invoice_id: string | null;
  created_at: string;
  created_by: string | null;
}
