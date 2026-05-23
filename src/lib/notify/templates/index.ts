/**
 * 알림 템플릿 — key 별 한국어 본문.
 *
 * 변수 치환: {{name}} 형식. 누락 시 빈 문자열.
 */

import { formatWonSuffix } from "@/lib/money";
import { formatKoreanDate } from "@/lib/dates";

export type TemplateKey =
  | "invoice_issued"
  | "payment_received"
  | "rent_overdue_d1"
  | "rent_overdue_d7"
  | "rent_overdue_d15"
  | "rent_overdue_d30"
  | "lease_expiring_60d"
  | "lease_terminated"
  | "complaint_received"
  | "complaint_resolved"
  | "agency_signup_received"
  | "agency_approved"
  | "agency_rejected";

interface TemplateDef {
  subject: string;
  body: string;
}

const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  invoice_issued: {
    subject: "[JNP] 월세 청구서 발행",
    body: `안녕하세요 {{tenant_name}}님.\n{{period}} 월세 청구서가 발행되었습니다.\n\n· 마감일: {{due_date}}\n· 금액: {{amount_total}}\n\n청구 내역 확인: {{site_url}}/tenant/my-rent`,
  },
  payment_received: {
    subject: "[JNP] 입금 확인",
    body: `안녕하세요 {{tenant_name}}님.\n{{paid_at}} 입금하신 {{amount}}을 확인했습니다.\n감사합니다.`,
  },
  rent_overdue_d1: {
    subject: "[JNP] 월세 납부 지연 안내",
    body: `안녕하세요 {{tenant_name}}님.\n{{due_date}} 까지 납부하셨어야 할 월세가 미납되었습니다.\n\n· 금액: {{amount_outstanding}}\n\n빠른 시일 내 납부 부탁드립니다.`,
  },
  rent_overdue_d7: {
    subject: "[JNP] 월세 연체 안내 (7일)",
    body: `{{tenant_name}}님, 월세 미납 7일이 경과했습니다.\n\n· 미납 잔액: {{amount_outstanding}}\n· 누적 연체이자: {{interest}}\n\n관리실로 연락 부탁드립니다.`,
  },
  rent_overdue_d15: {
    subject: "[JNP] 월세 연체 통지 (15일)",
    body: `{{tenant_name}}님, 월세 미납 15일이 경과했습니다.\n\n· 미납 잔액: {{amount_outstanding}}\n· 누적 연체이자: {{interest}}\n\n계약 위반 사유가 될 수 있습니다. 즉시 납부하시거나 관리실로 연락 주시기 바랍니다.`,
  },
  rent_overdue_d30: {
    subject: "[JNP] 최종 독촉 통지 (30일)",
    body: `{{tenant_name}}님, 월세 미납 30일이 경과했습니다.\n\n· 미납 잔액: {{amount_outstanding}}\n· 누적 연체이자: {{interest}}\n\n계약 해지 및 법적 조치가 진행될 수 있습니다. 즉시 관리실로 연락 부탁드립니다.`,
  },
  lease_expiring_60d: {
    subject: "[JNP] 계약 만료 안내 (60일 전)",
    body: `{{tenant_name}}님, 임대차 계약 만료가 60일 남았습니다.\n\n· 종료일: {{end_date}}\n\n갱신 또는 퇴거 의향을 관리실에 알려 주시면 협의를 시작하겠습니다.`,
  },
  lease_terminated: {
    subject: "[JNP] 계약 해지 처리",
    body: `{{tenant_name}}님, 임대차 계약이 해지되었습니다.\n\n· 해지일: {{termination_date}}\n· 환급액: {{refund}}\n\n정산서를 별도로 전달드립니다.`,
  },
  complaint_received: {
    subject: "[JNP] 민원 접수",
    body: `안녕하세요 {{tenant_name}}님.\n민원이 접수되었습니다.\n\n· 접수번호: {{lookup_code}}\n· 제목: {{title}}\n\n관리자가 확인 후 빠르게 연락드립니다.`,
  },
  complaint_resolved: {
    subject: "[JNP] 민원 처리 완료",
    body: `{{tenant_name}}님, 접수하신 민원이 처리 완료되었습니다.\n\n· 접수번호: {{lookup_code}}\n· 처리 내용: {{admin_memo}}`,
  },
  agency_signup_received: {
    subject: "[JNP] 부동산 가입 신청 접수",
    body: `{{company_name}}님, 부동산 파트너 가입 신청이 접수되었습니다.\n사업자 정보 확인 후 승인 처리됩니다.`,
  },
  agency_approved: {
    subject: "[JNP] 부동산 가입 승인",
    body: `{{company_name}}님, 부동산 파트너 가입이 승인되었습니다.\n공실 매물 정보를 자유롭게 열람하실 수 있습니다.\n{{site_url}}/agency/vacancies`,
  },
  agency_rejected: {
    subject: "[JNP] 부동산 가입 거절",
    body: `{{company_name}}님, 부동산 파트너 가입 신청이 거절되었습니다.\n사유: {{reason}}`,
  },
};

export function renderTemplate(
  key: TemplateKey,
  payload: Record<string, unknown>,
): { subject: string; body: string } {
  const tpl = TEMPLATES[key];
  if (!tpl) throw new Error(`unknown template: ${key}`);

  const enriched = enrich(payload);
  const subject = interpolate(tpl.subject, enriched);
  const body = interpolate(tpl.body, enriched);
  return { subject, body };
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

/** 금액/날짜 자동 포맷팅. */
function enrich(payload: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v == null) {
      out[k] = "";
      continue;
    }
    if (k.includes("amount") || k.includes("refund") || k.includes("interest")) {
      out[k] = typeof v === "number" ? formatWonSuffix(v) : String(v);
    } else if ((k.includes("date") || k.endsWith("_at")) && typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      out[k] = formatKoreanDate(v.slice(0, 10));
    } else {
      out[k] = String(v);
    }
  }
  if (!out.site_url) out.site_url = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jnp-housing.com";
  return out;
}

export function listTemplates(): { key: TemplateKey; subject: string; body: string }[] {
  return (Object.keys(TEMPLATES) as TemplateKey[]).map((k) => ({ key: k, ...TEMPLATES[k] }));
}
