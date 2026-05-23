/**
 * PII 마스킹 — UI 표시용. 실제 암복호화는 별도 (Phase 추후).
 */

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 8) return phone;
  if (digits.length === 11) return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-***-${digits.slice(-4)}`;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function maskName(name: string | null | undefined): string {
  if (!name) return "-";
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}`;
}

export function maskAccount(account: string | null | undefined): string {
  if (!account) return "-";
  const cleaned = account.replace(/[^0-9-]/g, "");
  if (cleaned.length < 6) return "****";
  return `${cleaned.slice(0, 3)}-****-${cleaned.slice(-4)}`;
}

export function maskBusinessNumber(bn: string | null | undefined): string {
  if (!bn) return "-";
  const d = bn.replace(/[^0-9]/g, "");
  if (d.length !== 10) return bn;
  return `${d.slice(0, 3)}-**-*****`;
}

export function maskIdNumber(id: string | null | undefined): string {
  if (!id) return "-";
  // 주민번호 패턴: 6-7 자리 → 앞6 + 뒤1 + 6 마스킹
  const d = id.replace(/[^0-9]/g, "");
  if (d.length !== 13) return "******-*******";
  return `${d.slice(0, 6)}-${d[6]}******`;
}
