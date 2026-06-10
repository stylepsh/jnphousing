"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin, getClientIp } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function approveAgency(id: string) {
  try {
    // 회원 승인은 super(stylepsh) 전용
    const ctx = await requireSuperAdmin();
    if (!z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID 입니다." };
    }
    const supabase = createServiceClient();
    const { data: before } = await supabase.from("agencies").select("*").eq("id", id).maybeSingle();
    const beforeRow = before as { phone?: string; company_name?: string; status?: string } | null;

    const { error } = await supabase
      .from("agencies")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: ctx.user.id,
        reject_reason: null,
      })
      .eq("id", id);
    if (error) {
      console.error("[approveAgency]", error);
      return { ok: false as const, error: "승인 실패" };
    }

    await audit({
      action: "agency.approve",
      resource_type: "agency",
      resource_id: id,
      before: { status: beforeRow?.status ?? null },
      after: { status: "approved" },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });
    if (beforeRow?.phone) {
      void notify({
        channel: "sms",
        recipient: beforeRow.phone,
        template_key: "agency_approved",
        payload: { company_name: beforeRow.company_name ?? "" },
      });
    }

    revalidatePath("/admin/agencies");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[approveAgency] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

const rejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function rejectAgency(id: string, reason: string) {
  try {
    // 회원 승인은 super(stylepsh) 전용
    const ctx = await requireSuperAdmin();
    const parsed = rejectSchema.safeParse({ id, reason });
    if (!parsed.success) return { ok: false as const, error: "입력값 오류" };

    const supabase = createServiceClient();
    const { data: before } = await supabase.from("agencies").select("*").eq("id", parsed.data.id).maybeSingle();
    const beforeRow = before as { phone?: string; company_name?: string; status?: string } | null;

    const { error } = await supabase
      .from("agencies")
      .update({
        status: "rejected",
        reject_reason: parsed.data.reason || null,
      })
      .eq("id", parsed.data.id);
    if (error) {
      console.error("[rejectAgency]", error);
      return { ok: false as const, error: "거절 처리 실패" };
    }

    await audit({
      action: "agency.reject",
      resource_type: "agency",
      resource_id: parsed.data.id,
      before: { status: beforeRow?.status ?? null },
      after: { status: "rejected", reason: parsed.data.reason ?? null },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });
    if (beforeRow?.phone) {
      void notify({
        channel: "sms",
        recipient: beforeRow.phone,
        template_key: "agency_rejected",
        payload: { company_name: beforeRow.company_name ?? "", reason: parsed.data.reason ?? "" },
      });
    }

    revalidatePath("/admin/agencies");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[rejectAgency] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
