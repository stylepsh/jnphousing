/**
 * 메시지 발송 adapter (P30-95).
 *
 * 환경변수 없으면 자동으로 mock 모드 (console.log) — 빌드/실행 안 깨짐.
 * 박성혁 원칙 #7 (외부 연동 try/catch + fallback).
 */

export type MessageChannel = "kakao" | "sms" | "email" | "console";

export interface MessagePayload {
  channel: MessageChannel;
  to: string;
  templateKey?: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface MessageResult {
  ok: boolean;
  channel: MessageChannel;
  mockMode: boolean;
  externalId?: string;
  error?: string;
}

const KAKAO_KEY = process.env.KAKAO_BIZ_API_KEY;
const KAKAO_SENDER = process.env.KAKAO_BIZ_SENDER;
const NCP_SENS_ACCESS = process.env.NCP_SENS_ACCESS_KEY;
const NCP_SENS_SECRET = process.env.NCP_SENS_SECRET_KEY;
const NCP_SENS_SERVICE = process.env.NCP_SENS_SERVICE_ID;
const NCP_SENS_FROM = process.env.NCP_SENS_FROM;

function isKakaoConfigured() {
  return Boolean(KAKAO_KEY && KAKAO_SENDER);
}
function isSmsConfigured() {
  return Boolean(NCP_SENS_ACCESS && NCP_SENS_SECRET && NCP_SENS_SERVICE && NCP_SENS_FROM);
}

async function sendKakao(p: MessagePayload): Promise<MessageResult> {
  if (!isKakaoConfigured()) {
    console.warn("[messaging.kakao] not configured — mock send", { to: p.to, body: p.body.slice(0, 50) });
    return { ok: true, channel: "kakao", mockMode: true };
  }
  // 실제 카카오 비즈메시지 SDK 연동 자리.
  // BLOCKERS B-101 카카오 발신프로필 등록 후 구현.
  try {
    // const res = await fetch(...) ; // TODO
    console.warn("[messaging.kakao] live adapter not yet implemented");
    return { ok: false, channel: "kakao", mockMode: false, error: "Kakao live adapter pending" };
  } catch (e) {
    return { ok: false, channel: "kakao", mockMode: false, error: String(e) };
  }
}

async function sendSms(p: MessagePayload): Promise<MessageResult> {
  if (!isSmsConfigured()) {
    console.warn("[messaging.sms] not configured — mock send", { to: p.to, body: p.body.slice(0, 50) });
    return { ok: true, channel: "sms", mockMode: true };
  }
  // 실제 NCP SENS SMS API 연동 자리.
  try {
    console.warn("[messaging.sms] live adapter not yet implemented");
    return { ok: false, channel: "sms", mockMode: false, error: "SMS live adapter pending" };
  } catch (e) {
    return { ok: false, channel: "sms", mockMode: false, error: String(e) };
  }
}

async function sendEmail(p: MessagePayload): Promise<MessageResult> {
  console.warn("[messaging.email] mock send", { to: p.to, subject: p.subject });
  // resend / Vercel email 연동 자리.
  return { ok: true, channel: "email", mockMode: true };
}

function sendConsole(p: MessagePayload): MessageResult {
  console.log("[messaging.console]", {
    to: p.to,
    subject: p.subject,
    body: p.body,
    metadata: p.metadata,
  });
  return { ok: true, channel: "console", mockMode: true };
}

export async function sendMessage(payload: MessagePayload): Promise<MessageResult> {
  try {
    switch (payload.channel) {
      case "kakao":   return await sendKakao(payload);
      case "sms":     return await sendSms(payload);
      case "email":   return await sendEmail(payload);
      case "console": return sendConsole(payload);
    }
  } catch (e) {
    console.warn("[sendMessage] unhandled", e);
    return { ok: false, channel: payload.channel, mockMode: true, error: String(e) };
  }
}

/**
 * 통합 발송 + DB 큐 적재.
 * @param payload 메시지
 * @param dbInsert (선택) Supabase notifications insert 콜백
 */
export async function sendWithQueue(
  payload: MessagePayload,
  dbInsert?: (status: "sent" | "failed" | "queued", externalId?: string, error?: string) => Promise<void>
): Promise<MessageResult> {
  const result = await sendMessage(payload);
  try {
    await dbInsert?.(result.ok ? "sent" : "failed", result.externalId, result.error);
  } catch (e) {
    console.warn("[sendWithQueue] dbInsert failed", e);
  }
  return result;
}
