"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin, getClientIp } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function revalidate() {
  revalidatePath("/admin/members");
}

/** 임대인 신청 승인 — 소유주(owners) 레코드에 연결해 임대인존 접근 권한 부여 */
export async function approveLandlordApplication(applicationId: string, ownerId: string) {
  try {
    const ctx = await requireSuperAdmin();
    if (!z.string().uuid().safeParse(applicationId).success || !z.string().uuid().safeParse(ownerId).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }

    const supabase = createServiceClient();
    const { data: appRow } = await supabase
      .from("member_applications")
      .select("id, role, user_id, status, name")
      .eq("id", applicationId)
      .maybeSingle();
    const application = appRow as { id: string; role: string; user_id: string | null; status: string; name: string } | null;
    if (!application || application.role !== "landlord") return { ok: false as const, error: "임대인 신청을 찾을 수 없습니다." };
    if (!application.user_id) return { ok: false as const, error: "신청에 연결된 계정이 없습니다." };
    if (application.status === "approved") return { ok: false as const, error: "이미 승인된 신청입니다." };

    // 임대인존 접근 권한: landlord_users 매핑 (016에서 owners FK)
    const { error: linkErr } = await supabase
      .from("landlord_users")
      .upsert({ user_id: application.user_id, landlord_id: ownerId }, { onConflict: "user_id" });
    if (linkErr) {
      console.error("[approveLandlordApplication] link", linkErr);
      return { ok: false as const, error: "소유주 연결 실패" };
    }

    const { error } = await supabase
      .from("member_applications")
      .update({
        status: "approved",
        linked_owner_id: ownerId,
        approved_at: new Date().toISOString(),
        approved_by: ctx.user.id,
        reject_reason: null,
      })
      .eq("id", applicationId);
    if (error) return { ok: false as const, error: "승인 처리 실패" };

    await audit({
      action: "member.approve",
      resource_type: "member_application",
      resource_id: applicationId,
      before: { status: application.status },
      after: { status: "approved", linked_owner_id: ownerId },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[approveLandlordApplication] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 직원 신청 승인 — admin_users 에 staff 로 등록되어 즉시 관리자 화면 사용 가능 */
export async function approveStaffApplication(applicationId: string) {
  try {
    const ctx = await requireSuperAdmin();
    if (!z.string().uuid().safeParse(applicationId).success) return { ok: false as const, error: "잘못된 ID" };

    const supabase = createServiceClient();
    const { data: appRow } = await supabase
      .from("member_applications")
      .select("id, role, user_id, status, name")
      .eq("id", applicationId)
      .maybeSingle();
    const application = appRow as { id: string; role: string; user_id: string | null; status: string; name: string } | null;
    if (!application || application.role !== "staff") return { ok: false as const, error: "직원 신청을 찾을 수 없습니다." };
    if (!application.user_id) return { ok: false as const, error: "신청에 연결된 계정이 없습니다." };
    if (application.status === "approved") return { ok: false as const, error: "이미 승인된 신청입니다." };

    const { error: adminErr } = await supabase
      .from("admin_users")
      .upsert({ user_id: application.user_id, name: application.name, role: "staff" }, { onConflict: "user_id" });
    if (adminErr) {
      console.error("[approveStaffApplication] admin_users", adminErr);
      return { ok: false as const, error: "직원 계정 등록 실패" };
    }

    const { error } = await supabase
      .from("member_applications")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: ctx.user.id,
        reject_reason: null,
      })
      .eq("id", applicationId);
    if (error) return { ok: false as const, error: "승인 처리 실패" };

    await audit({
      action: "member.approve",
      resource_type: "member_application",
      resource_id: applicationId,
      before: { status: application.status },
      after: { status: "approved", role: "staff" },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[approveStaffApplication] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 임차인 신청 승인 — 확인 완료 표시 (실제 임차인 등록은 계약 등록 흐름에서) */
export async function approveTenantApplication(applicationId: string) {
  try {
    const ctx = await requireSuperAdmin();
    if (!z.string().uuid().safeParse(applicationId).success) return { ok: false as const, error: "잘못된 ID" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("member_applications")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: ctx.user.id,
        reject_reason: null,
      })
      .eq("id", applicationId)
      .eq("role", "tenant");
    if (error) return { ok: false as const, error: "승인 처리 실패" };

    await audit({
      action: "member.approve",
      resource_type: "member_application",
      resource_id: applicationId,
      before: null,
      after: { status: "approved" },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 신청 반려 */
export async function rejectApplication(applicationId: string, reason: string) {
  try {
    const ctx = await requireSuperAdmin();
    if (!z.string().uuid().safeParse(applicationId).success) return { ok: false as const, error: "잘못된 ID" };
    const parsedReason = z.string().min(1, "반려 사유를 입력하세요").max(500).safeParse(reason.trim());
    if (!parsedReason.success) return { ok: false as const, error: parsedReason.error.issues[0]?.message ?? "사유 오류" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("member_applications")
      .update({ status: "rejected", reject_reason: parsedReason.data })
      .eq("id", applicationId);
    if (error) return { ok: false as const, error: "반려 처리 실패" };

    await audit({
      action: "member.reject",
      resource_type: "member_application",
      resource_id: applicationId,
      before: null,
      after: { status: "rejected", reason: parsedReason.data },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
