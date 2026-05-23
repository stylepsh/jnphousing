/**
 * 감사 로그 (audit_logs).
 *
 * 사용 (server action / route handler 안에서):
 *   await audit({
 *     action: "lease.update",
 *     resource_type: "lease",
 *     resource_id: lease.id,
 *     before: { status: "draft" },
 *     after: { status: "active" },
 *     actor_id: ctx.user.id,
 *     actor_role: "admin",
 *   });
 *
 * 실패해도 throw 하지 않음 (감사 누락이 비즈니스 실패를 야기하면 안 됨).
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

export interface AuditEntry {
  action: string;             // "lease.update", "payment.record", ...
  resource_type: string;      // "lease", "invoice", "agency"
  resource_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  actor_id?: string | null;
  actor_role?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("audit_logs").insert({
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      actor_id: entry.actor_id ?? null,
      actor_role: entry.actor_role ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.user_agent ?? null,
    });
  } catch (e) {
    console.error("[audit] failed to insert", e);
  }
}
