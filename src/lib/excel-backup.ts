/**
 * 종합 엑셀 백업 생성.
 *
 * 모든 운영 데이터를 시트별로 묶어 단일 .xlsx 로 반환.
 * - admin 만 호출 (server route 안에서 requireAdmin 후 사용)
 * - service_role 로 모든 테이블 직접 조회 (RLS 우회)
 *
 * Worksheet 구성:
 *   01_건물 / 02_호실 / 03_임대인 / 04_임차인 / 05_계약
 *   06_청구스케줄 / 07_청구서 / 08_입금 / 09_위탁수수료
 *   10_민원 / 11_관리문의 / 12_부동산회원 / 13_공실매물
 *   14_공지 / 15_서류 / 16_계약이벤트 / 17_알림로그 / 18_감사로그
 *
 * 모든 시트 헤더는 한국어. timestamp 는 KST 형식 'YYYY-MM-DD HH:mm'.
 */

import "server-only";

import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";

interface SheetSpec<TRow> {
  title: string;
  columns: { header: string; key: keyof TRow & string; width?: number }[];
  fetchAll: () => Promise<TRow[]>;
}

// ---- 데이터 페치 헬퍼 ------------------------------------------------------
function supabase() {
  return createServiceClient();
}

async function fetchAll<T>(table: string, order?: { col: string; asc?: boolean }): Promise<T[]> {
  const q = supabase().from(table).select("*");
  const ordered = order ? q.order(order.col, { ascending: order.asc ?? false }) : q;
  const { data, error } = await ordered.limit(10000);
  if (error) {
    console.error(`[excel-backup] fetch ${table}`, error);
    return [];
  }
  return (data ?? []) as T[];
}

// ---- 시트 생성기 ----------------------------------------------------------
function applyHeaderStyle(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C3A5E" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.cellCount } };
}

function ts(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = v.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!m) return v;
  return `${m[1]} ${m[2]}`;
}

function jsonShort(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    const s = JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 197) + "..." : s;
  } catch {
    return String(v);
  }
}

// ---- 메인 ------------------------------------------------------------------
export async function buildBackupWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "JNP주택관리 시스템";
  wb.created = new Date();

  // 메타 시트
  const meta = wb.addWorksheet("백업정보");
  meta.columns = [
    { header: "항목", key: "k", width: 30 },
    { header: "값", key: "v", width: 60 },
  ];
  meta.addRow({ k: "백업 일시", v: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC" });
  meta.addRow({ k: "회사명", v: "JNP주택관리 (제이앤피 주택관리) · 대표 박재흥 · 사업자등록번호 361-27-02026" });
  meta.addRow({ k: "시스템 버전", v: "v1.0" });
  meta.addRow({ k: "포함 시트", v: "건물·호실·임대인·임차인·계약·청구·입금·수수료·민원·문의·회원·매물·공지·서류·이벤트·알림·감사" });
  applyHeaderStyle(meta);

  // 1. properties
  const wsProperties = wb.addWorksheet("01_건물");
  wsProperties.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "건물명", key: "name", width: 24 },
    { header: "주소", key: "address", width: 40 },
    { header: "유형", key: "type", width: 12 },
    { header: "총세대수", key: "total_units", width: 10 },
    { header: "공개", key: "is_published", width: 8 },
    { header: "표시순서", key: "display_order", width: 10 },
    { header: "썸네일URL", key: "thumbnail_url", width: 40 },
    { header: "설명", key: "description", width: 40 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("properties", { col: "display_order", asc: true })) {
    wsProperties.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsProperties);

  // 2. properties_units
  const wsUnits = wb.addWorksheet("02_호실");
  wsUnits.columns = [
    { header: "호실ID", key: "id", width: 36 },
    { header: "건물ID", key: "property_id", width: 36 },
    { header: "호실번호", key: "unit_no", width: 12 },
    { header: "동", key: "dong", width: 8 },
    { header: "층", key: "floor", width: 8 },
    { header: "평형", key: "area_pyeong", width: 10 },
    { header: "m²", key: "area_m2", width: 10 },
    { header: "방수", key: "room_count", width: 8 },
    { header: "욕실수", key: "bathroom_count", width: 8 },
    { header: "기본보증금", key: "deposit_default", width: 14 },
    { header: "기본월세", key: "rent_default", width: 14 },
    { header: "기본관리비", key: "management_fee_default", width: 12 },
    { header: "메모", key: "notes", width: 30 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("properties_units", { col: "unit_no", asc: true })) {
    wsUnits.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsUnits);

  // 3. landlords
  const wsLandlords = wb.addWorksheet("03_임대인");
  wsLandlords.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "이름", key: "name", width: 16 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "이메일", key: "email", width: 24 },
    { header: "은행", key: "account_bank", width: 12 },
    { header: "예금주", key: "account_holder", width: 14 },
    { header: "계좌번호", key: "account_number_encrypted", width: 20 },
    { header: "사업자번호", key: "business_number_encrypted", width: 16 },
    { header: "메모", key: "memo", width: 30 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("landlords", { col: "name", asc: true })) {
    wsLandlords.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsLandlords);

  // 4. tenants
  const wsTenants = wb.addWorksheet("04_임차인");
  wsTenants.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "이름", key: "name", width: 16 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "끝4자리", key: "phone_last4", width: 8 },
    { header: "비상연락", key: "emergency_contact", width: 16 },
    { header: "주민번호", key: "id_number_encrypted", width: 18 },
    { header: "입주일", key: "move_in_date", width: 12 },
    { header: "퇴거일", key: "move_out_date", width: 12 },
    { header: "메모", key: "memo", width: 30 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("tenants", { col: "name", asc: true })) {
    wsTenants.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsTenants);

  // 5. leases
  const wsLeases = wb.addWorksheet("05_계약");
  wsLeases.columns = [
    { header: "계약ID", key: "id", width: 36 },
    { header: "이전계약ID", key: "prev_lease_id", width: 36 },
    { header: "유형", key: "lease_type", width: 10 },
    { header: "호실ID", key: "unit_id", width: 36 },
    { header: "임대인ID", key: "landlord_id", width: 36 },
    { header: "임차인ID", key: "tenant_id", width: 36 },
    { header: "상태", key: "status", width: 10 },
    { header: "시작일", key: "start_date", width: 12 },
    { header: "종료일", key: "end_date", width: 12 },
    { header: "보증금", key: "deposit", width: 14 },
    { header: "월세", key: "rent_amount", width: 14 },
    { header: "주기", key: "rent_cycle", width: 10 },
    { header: "청구일", key: "rent_day", width: 8 },
    { header: "관리비", key: "management_fee", width: 12 },
    { header: "부가세포함", key: "vat_included", width: 10 },
    { header: "수수료유형", key: "fee_type", width: 10 },
    { header: "수수료율(%)", key: "fee_percent", width: 12 },
    { header: "수수료정액", key: "fee_fixed", width: 14 },
    { header: "연체이율(%)", key: "overdue_annual_rate", width: 12 },
    { header: "특약", key: "special_terms", width: 40 },
    { header: "계약서경로", key: "contract_file_path", width: 30 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("leases", { col: "start_date", asc: false })) {
    wsLeases.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsLeases);

  // 6. rent_schedules
  const wsSch = wb.addWorksheet("06_청구스케줄");
  wsSch.columns = [
    { header: "스케줄ID", key: "id", width: 36 },
    { header: "계약ID", key: "lease_id", width: 36 },
    { header: "청구일", key: "due_date", width: 12 },
    { header: "월세", key: "amount_rent", width: 14 },
    { header: "관리비", key: "amount_management", width: 12 },
    { header: "부가세", key: "amount_vat", width: 10 },
    { header: "합계", key: "amount_total", width: 14 },
    { header: "일할여부", key: "prorated", width: 8 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("rent_schedules", { col: "due_date", asc: true })) {
    wsSch.addRow(r);
  }
  applyHeaderStyle(wsSch);

  // 7. rent_invoices
  const wsInv = wb.addWorksheet("07_청구서");
  wsInv.columns = [
    { header: "청구서ID", key: "id", width: 36 },
    { header: "스케줄ID", key: "schedule_id", width: 36 },
    { header: "계약ID", key: "lease_id", width: 36 },
    { header: "발행일", key: "issued_at", width: 18 },
    { header: "마감일", key: "due_date", width: 12 },
    { header: "청구합계", key: "amount_total", width: 14 },
    { header: "납부합계", key: "paid_total", width: 14 },
    { header: "상태", key: "status", width: 10 },
    { header: "연체일", key: "overdue_days", width: 8 },
    { header: "연체이자", key: "overdue_interest", width: 12 },
    { header: "메모", key: "note", width: 24 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("rent_invoices", { col: "due_date", asc: false })) {
    wsInv.addRow({ ...r, issued_at: ts(r.issued_at) });
  }
  applyHeaderStyle(wsInv);

  // 8. rent_payments
  const wsPay = wb.addWorksheet("08_입금");
  wsPay.columns = [
    { header: "입금ID", key: "id", width: 36 },
    { header: "청구서ID", key: "invoice_id", width: 36 },
    { header: "입금일시", key: "paid_at", width: 18 },
    { header: "금액", key: "amount", width: 14 },
    { header: "경로", key: "source", width: 12 },
    { header: "메모", key: "memo", width: 30 },
    { header: "기록자", key: "recorded_by", width: 36 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("rent_payments", { col: "paid_at", asc: false })) {
    wsPay.addRow({ ...r, paid_at: ts(r.paid_at) });
  }
  applyHeaderStyle(wsPay);

  // 9. agency_commissions
  const wsCom = wb.addWorksheet("09_위탁수수료");
  wsCom.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "계약ID", key: "lease_id", width: 36 },
    { header: "기간시작", key: "period_start", width: 12 },
    { header: "기간종료", key: "period_end", width: 12 },
    { header: "기준액", key: "base_amount", width: 14 },
    { header: "수수료", key: "commission_amount", width: 14 },
    { header: "상태", key: "status", width: 10 },
    { header: "정산일", key: "paid_at", width: 18 },
    { header: "메모", key: "note", width: 24 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("agency_commissions", { col: "period_end", asc: false })) {
    wsCom.addRow({ ...r, paid_at: ts(r.paid_at) });
  }
  applyHeaderStyle(wsCom);

  // 10. complaints
  const wsComplaints = wb.addWorksheet("10_민원");
  wsComplaints.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "건물", key: "building_name", width: 20 },
    { header: "호수", key: "unit_number", width: 10 },
    { header: "입주자", key: "tenant_name", width: 14 },
    { header: "연락처", key: "tenant_phone", width: 16 },
    { header: "분류", key: "category", width: 10 },
    { header: "제목", key: "title", width: 30 },
    { header: "내용", key: "content", width: 50 },
    { header: "상태", key: "status", width: 10 },
    { header: "메모", key: "admin_memo", width: 30 },
    { header: "담당자", key: "assigned_to", width: 14 },
    { header: "접수일", key: "created_at", width: 18 },
    { header: "처리완료일", key: "resolved_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("complaints", { col: "created_at", asc: false })) {
    wsComplaints.addRow({ ...r, created_at: ts(r.created_at), resolved_at: ts(r.resolved_at) });
  }
  applyHeaderStyle(wsComplaints);

  // 11. inquiries
  const wsInq = wb.addWorksheet("11_관리문의");
  wsInq.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "회사명", key: "company_name", width: 20 },
    { header: "담당자", key: "contact_name", width: 14 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "이메일", key: "email", width: 24 },
    { header: "건물주소", key: "building_address", width: 40 },
    { header: "건물유형", key: "building_type", width: 12 },
    { header: "세대수", key: "total_units", width: 8 },
    { header: "내용", key: "message", width: 50 },
    { header: "상태", key: "status", width: 10 },
    { header: "메모", key: "admin_memo", width: 30 },
    { header: "접수일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("inquiries", { col: "created_at", asc: false })) {
    wsInq.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsInq);

  // 12. agencies
  const wsAg = wb.addWorksheet("12_부동산회원");
  wsAg.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "회사명", key: "company_name", width: 24 },
    { header: "사업자번호", key: "business_number", width: 16 },
    { header: "대표자", key: "representative", width: 14 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "주소", key: "address", width: 40 },
    { header: "상태", key: "status", width: 10 },
    { header: "거절사유", key: "reject_reason", width: 30 },
    { header: "승인일", key: "approved_at", width: 18 },
    { header: "신청일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("agencies", { col: "created_at", asc: false })) {
    wsAg.addRow({ ...r, approved_at: ts(r.approved_at), created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsAg);

  // 13. vacancies
  const wsVac = wb.addWorksheet("13_공실매물");
  wsVac.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "건물ID", key: "property_id", width: 36 },
    { header: "호수", key: "unit_number", width: 10 },
    { header: "층", key: "floor", width: 6 },
    { header: "평", key: "area_pyeong", width: 8 },
    { header: "방", key: "room_count", width: 6 },
    { header: "보증금", key: "deposit", width: 14 },
    { header: "월세", key: "monthly_rent", width: 14 },
    { header: "관리비", key: "maintenance_fee", width: 12 },
    { header: "입주가능일", key: "move_in_date", width: 12 },
    { header: "설명", key: "description", width: 40 },
    { header: "상태", key: "status", width: 10 },
    { header: "공개", key: "is_published", width: 8 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("vacancies", { col: "created_at", asc: false })) {
    wsVac.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsVac);

  // 14. notices
  const wsNot = wb.addWorksheet("14_공지");
  wsNot.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "건물ID", key: "property_id", width: 36 },
    { header: "제목", key: "title", width: 30 },
    { header: "내용", key: "content", width: 50 },
    { header: "고정", key: "is_pinned", width: 8 },
    { header: "공개", key: "is_published", width: 8 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("notices", { col: "created_at", asc: false })) {
    wsNot.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsNot);

  // 15. downloads
  const wsDown = wb.addWorksheet("15_서류");
  wsDown.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "카테고리", key: "category", width: 10 },
    { header: "제목", key: "title", width: 30 },
    { header: "설명", key: "description", width: 40 },
    { header: "파일URL", key: "file_url", width: 60 },
    { header: "크기KB", key: "file_size_kb", width: 10 },
    { header: "버전", key: "version", width: 10 },
    { header: "공개", key: "is_published", width: 8 },
    { header: "등록일", key: "created_at", width: 18 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("downloads", { col: "category", asc: true })) {
    wsDown.addRow({ ...r, created_at: ts(r.created_at) });
  }
  applyHeaderStyle(wsDown);

  // 16. lease_events
  const wsEv = wb.addWorksheet("16_계약이벤트");
  wsEv.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "계약ID", key: "lease_id", width: 36 },
    { header: "이벤트유형", key: "event_type", width: 16 },
    { header: "발생시각", key: "event_date", width: 18 },
    { header: "내역", key: "payload", width: 60 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("lease_events", { col: "event_date", asc: false })) {
    wsEv.addRow({ ...r, event_date: ts(r.event_date), payload: jsonShort(r.payload) });
  }
  applyHeaderStyle(wsEv);

  // 17. notifications
  const wsNf = wb.addWorksheet("17_알림로그");
  wsNf.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "채널", key: "channel", width: 10 },
    { header: "받는이", key: "recipient", width: 16 },
    { header: "템플릿", key: "template_key", width: 24 },
    { header: "상태", key: "status", width: 10 },
    { header: "에러", key: "error_message", width: 30 },
    { header: "발송시각", key: "sent_at", width: 18 },
    { header: "등록일", key: "created_at", width: 18 },
    { header: "본문(요약)", key: "payload", width: 60 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("notifications", { col: "created_at", asc: false })) {
    wsNf.addRow({
      ...r,
      sent_at: ts(r.sent_at),
      created_at: ts(r.created_at),
      payload: jsonShort(r.payload),
    });
  }
  applyHeaderStyle(wsNf);

  // 18. audit_logs
  const wsAudit = wb.addWorksheet("18_감사로그");
  wsAudit.columns = [
    { header: "ID", key: "id", width: 36 },
    { header: "시각", key: "created_at", width: 18 },
    { header: "주체ID", key: "actor_id", width: 36 },
    { header: "주체역할", key: "actor_role", width: 10 },
    { header: "액션", key: "action", width: 24 },
    { header: "대상유형", key: "resource_type", width: 14 },
    { header: "대상ID", key: "resource_id", width: 36 },
    { header: "변경전", key: "before", width: 40 },
    { header: "변경후", key: "after", width: 40 },
    { header: "IP", key: "ip", width: 16 },
    { header: "User-Agent", key: "user_agent", width: 30 },
  ];
  for (const r of await fetchAll<Record<string, unknown>>("audit_logs", { col: "created_at", asc: false })) {
    wsAudit.addRow({
      ...r,
      created_at: ts(r.created_at),
      before: jsonShort(r.before),
      after: jsonShort(r.after),
    });
  }
  applyHeaderStyle(wsAudit);

  // 출력
  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf as ArrayBuffer);
}
