/**
 * 알림 시스템 진입점.
 *
 * 사용:
 *   await notify("rent_overdue_d7", {
 *     channel: "kakao",
 *     recipient: "01012345678",
 *     payload: { tenant_name: "홍길동", amount: 570000, due_date: "2026-05-25" },
 *     related_lease_id: "...",
 *     related_invoice_id: "...",
 *   });
 *
 * 동작:
 * - 환경변수로 채널 활성화 토글 (NOTIFY_ENABLE_KAKAO/SMS/EMAIL).
 * - 비활성 채널은 "console" 어댑터로 fallback.
 * - notifications 테이블에 항상 기록 (sent / failed / skipped).
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { renderTemplate, type TemplateKey } from "./templates";
import { consoleAdapter } from "./adapters/console";
import { kakaoAdapter } from "./adapters/kakao";
import { smsAdapter } from "./adapters/sms";
import type { NotifyChannel, NotifyStatus } from "@/types/lease";

export interface NotifyInput {
  channel: NotifyChannel;
  recipient: string;
  template_key: TemplateKey;
  payload: Record<string, unknown>;
  related_lease_id?: string | null;
  related_invoice_id?: string | null;
}

export interface NotifyResult {
  ok: boolean;
  channel_used: NotifyChannel;
  status: NotifyStatus;
  error?: string;
}

function isChannelEnabled(channel: NotifyChannel): boolean {
  switch (channel) {
    case "kakao": return process.env.NOTIFY_ENABLE_KAKAO === "true";
    case "sms": return process.env.NOTIFY_ENABLE_SMS === "true";
    case "email": return process.env.NOTIFY_ENABLE_EMAIL === "true";
    case "push": return process.env.NOTIFY_ENABLE_PUSH === "true";
    case "console": return true;
  }
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const supabase = createServiceClient();

  // 템플릿 렌더
  let rendered: { subject: string; body: string };
  try {
    rendered = renderTemplate(input.template_key, input.payload);
  } catch (e) {
    console.error("[notify] template render", e);
    return { ok: false, channel_used: input.channel, status: "failed", error: "template error" };
  }

  // 채널 비활성 → console fallback
  const useChannel: NotifyChannel = isChannelEnabled(input.channel) ? input.channel : "console";

  let send: { ok: boolean; error?: string };
  try {
    if (useChannel === "console") {
      send = await consoleAdapter({ recipient: input.recipient, subject: rendered.subject, body: rendered.body });
    } else if (useChannel === "kakao") {
      send = await kakaoAdapter({ recipient: input.recipient, subject: rendered.subject, body: rendered.body });
    } else if (useChannel === "sms") {
      send = await smsAdapter({ recipient: input.recipient, subject: rendered.subject, body: rendered.body });
    } else {
      // email/push 는 추후 구현
      send = await consoleAdapter({ recipient: input.recipient, subject: rendered.subject, body: rendered.body });
    }
  } catch (e) {
    send = { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }

  const status: NotifyStatus = useChannel !== input.channel ? "skipped" : send.ok ? "sent" : "failed";

  // 로그 기록 (실패해도 throw X)
  try {
    await supabase.from("notifications").insert({
      channel: useChannel,
      recipient: input.recipient,
      template_key: input.template_key,
      payload: { ...input.payload, subject: rendered.subject, body: rendered.body },
      sent_at: send.ok ? new Date().toISOString() : null,
      status,
      error_message: send.error ?? null,
      related_lease_id: input.related_lease_id ?? null,
      related_invoice_id: input.related_invoice_id ?? null,
    });
  } catch (e) {
    console.error("[notify] log insert", e);
  }

  return { ok: send.ok, channel_used: useChannel, status, error: send.error };
}
