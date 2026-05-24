/**
 * 상황별 이모지 가이드 — UI 표시 일관성 헬퍼.
 * DB 저장 안 함. UI 에서 import 해서 사용.
 */

export const EMOJI = {
  // 도메인 객체
  property: "🏢",
  unit: "🏠",
  tenant: "👤",
  landlord: "👔",
  agency: "🤝",
  contract: "📄",
  invoice: "🧾",
  payment: "💳",
  commission: "💰",
  report: "📊",
  complaint: "🔧",
  notice: "📢",
  download: "📥",

  // 상태
  status_active: "✅",
  status_pending: "⏳",
  status_overdue: "🚨",
  status_expiring: "⏰",
  status_resolved: "🎉",
  status_warning: "⚠️",
  status_locked: "🔒",
  status_published: "🌐",
  status_draft: "📝",

  // 액션
  add: "➕",
  edit: "✏️",
  delete: "🗑️",
  send: "📨",
  download_action: "⬇️",
  upload: "⬆️",
  refresh: "🔄",
  search: "🔍",

  // 알림 채널
  kakao: "💬",
  sms: "📱",
  email: "✉️",
  phone: "📞",
} as const;

/** 청구서 상태별 이모지 */
export function emojiForInvoiceStatus(status: string): string {
  switch (status) {
    case "paid": return EMOJI.status_active;
    case "partial": return EMOJI.status_pending;
    case "overdue": return EMOJI.status_overdue;
    case "waived": return EMOJI.status_locked;
    default: return "📝";
  }
}

/** 계약 상태별 이모지 */
export function emojiForLeaseStatus(status: string): string {
  switch (status) {
    case "active": return EMOJI.status_active;
    case "expiring": return EMOJI.status_expiring;
    case "draft": return EMOJI.status_draft;
    case "renewed": return EMOJI.refresh;
    case "terminated": return EMOJI.delete;
    case "expired": return EMOJI.status_locked;
    default: return "—";
  }
}

/** 호실 상태 (임차/공실) 이모지 */
export function emojiForUnitOccupancy(occupied: boolean, expiringSoon = false): string {
  if (!occupied) return "🏘️";
  if (expiringSoon) return EMOJI.status_expiring;
  return "🔑";
}
