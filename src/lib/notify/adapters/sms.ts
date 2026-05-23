/**
 * SMS 어댑터 — 인터페이스만.
 *
 * 후보 게이트웨이:
 * - NHN Cloud Toast SMS (https://www.nhncloud.com)
 * - Aligo 알리고
 * - SOLAPI
 *
 * 환경변수:
 * - SMS_PROVIDER (toast|aligo|solapi)
 * - SMS_API_URL
 * - SMS_API_KEY
 * - SMS_SENDER (발신번호, 사전등록 필수)
 *
 * 현재는 NotImplemented.
 */

export async function smsAdapter(input: { recipient: string; subject: string; body: string }) {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER;

  if (!apiUrl || !apiKey || !sender) {
    console.warn("[smsAdapter] 환경변수 미설정 — 발송 스킵", { recipient: input.recipient });
    return { ok: false as const, error: "sms_not_configured" };
  }

  // TODO(성혁): 실제 SMS API 호출
  console.warn("[smsAdapter] 실제 호출 미구현 (스텁). recipient=", input.recipient);
  return { ok: false as const, error: "sms_stub_not_implemented" };
}
