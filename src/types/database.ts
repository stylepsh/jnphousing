/**
 * Supabase 스키마 대응 TypeScript 타입
 * Phase 1 — supabase/migrations/001_init.sql 과 동기화 유지
 *
 * Database 인터페이스는 Supabase 표준 (Row/Insert/Update 구조)을 따른다.
 * Insert/Update 는 Partial 기반 — 엄격한 타입 검증은 zod 스키마로 처리.
 */

export type PropertyType = "officetel" | "apartment" | "villa" | "commercial";
export type ComplaintCategory = "as" | "complaint" | "noise" | "facility" | "etc";
export type ComplaintStatus = "received" | "in_progress" | "resolved" | "closed";
export type DownloadCategory = "contract" | "guide" | "form";
export type InquiryStatus = "new" | "contacted" | "closed";
export type AgencyStatus = "pending" | "approved" | "rejected";
export type VacancyStatus = "available" | "reserved" | "contracted";
export type AdminRole = "super" | "staff";

export interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  total_units: number;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  property_id: string | null;
  building_name: string | null;
  unit_number: string | null;
  tenant_name: string;
  tenant_phone: string;
  category: ComplaintCategory;
  title: string;
  content: string;
  images: string[];
  status: ComplaintStatus;
  admin_memo: string | null;
  assigned_to: string | null;
  kakao_channel_sent: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface Notice {
  id: string;
  property_id: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Download {
  id: string;
  category: DownloadCategory;
  title: string;
  description: string | null;
  file_url: string;
  file_size_kb: number | null;
  version: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  company_name: string | null;
  contact_name: string;
  phone: string;
  email: string | null;
  building_address: string;
  building_type: string | null;
  total_units: number | null;
  message: string;
  status: InquiryStatus;
  admin_memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agency {
  id: string;
  user_id: string;
  company_name: string;
  business_number: string;
  representative: string;
  phone: string;
  address: string | null;
  status: AgencyStatus;
  reject_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vacancy {
  id: string;
  property_id: string;
  unit_number: string;
  floor: number | null;
  area_m2: number | null;
  area_pyeong: number | null;
  room_count: number | null;
  bathroom_count: number | null;
  deposit: number;
  monthly_rent: number;
  maintenance_fee: number;
  move_in_date: string | null;
  description: string | null;
  images: string[];
  status: VacancyStatus;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  name: string;
  role: AdminRole;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      properties: { Row: Property; Insert: Partial<Property>; Update: Partial<Property>; Relationships: [] };
      complaints: { Row: Complaint; Insert: Partial<Complaint>; Update: Partial<Complaint>; Relationships: [] };
      notices: { Row: Notice; Insert: Partial<Notice>; Update: Partial<Notice>; Relationships: [] };
      downloads: { Row: Download; Insert: Partial<Download>; Update: Partial<Download>; Relationships: [] };
      inquiries: { Row: Inquiry; Insert: Partial<Inquiry>; Update: Partial<Inquiry>; Relationships: [] };
      agencies: { Row: Agency; Insert: Partial<Agency>; Update: Partial<Agency>; Relationships: [] };
      vacancies: { Row: Vacancy; Insert: Partial<Vacancy>; Update: Partial<Vacancy>; Relationships: [] };
      admin_users: { Row: AdminUser; Insert: Partial<AdminUser>; Update: Partial<AdminUser>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_approved_agency: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
