"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin, getClientIp } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";

/**
 * 직원 계정 권한·비밀번호 관리 — 최고 관리자 전용.
 * 비밀번호는 Supabase 가 단방향 해시로만 저장해 원래 값을 볼 수 없다. 대신 임시 비밀번호로 재설정하고 그 값을 한 번만 보여준다.
 */

const fail = (e: unknown) => ({ ok: false as const, error: e instanceof AppError ? e.message : "처리 중 오류가 발생했습니다." });

/** role: staff(직원) | readonly(조회 전용) | none(권한 해제 — 관리자 화면 접근 불가) */
export async function setStaffRole(adminId: string, role: "staff" | "readonly" | "none") {
  try {
    const ctx = await requireSuperAdmin();
    const id = z.string().uuid().parse(adminId);
    const next = z.enum(["staff", "readonly", "none"]).parse(role);
    if (id === ctx.admin.id) return { ok: false as const, error: "내 계정의 권한은 바꿀 수 없습니다." };

    const db = createServiceClient();
    const { data: row } = await db.from("admin_users").select("id, name, role").eq("id", id).maybeSingle();
    const before = row as { id: string; name: string; role: string } | null;
    if (!before) return { ok: false as const, error: "계정을 찾을 수 없습니다." };
    if (before.role === "super") return { ok: false as const, error: "최고 관리자 권한은 여기서 바꿀 수 없습니다." };

    const { error } = next === "none"
      ? await db.from("admin_users").delete().eq("id", id)
      : await db.from("admin_users").update({ role: next }).eq("id", id);
    if (error) return { ok: false as const, error: "권한 변경 실패" };

    await audit({
      action: "admin.role_change",
      resource_type: "admin_user",
      resource_id: id,
      before: { role: before.role },
      after: { role: next },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });
    revalidatePath("/admin/members");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

// 헷갈리는 글자(0/O, 1/l/I) 뺀 임시 비밀번호: 영문 4 + 숫자 4 + 기호 1
function tempPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (s: string, n: number) => Array.from({ length: n }, () => s[randomInt(s.length)]).join("");
  return `${pick(letters, 4)}${pick(digits, 4)}!`;
}

/** 임시 비밀번호로 재설정 — 새 비밀번호를 한 번만 돌려준다(저장·기록하지 않음). */
export async function resetStaffPassword(userId: string) {
  try {
    const ctx = await requireSuperAdmin();
    const id = z.string().uuid().parse(userId);
    if (id === ctx.user.id) return { ok: false as const, error: "내 비밀번호는 로그인 화면의 '비밀번호 찾기'로 바꿔 주세요." };

    const db = createServiceClient();
    const { data: row } = await db.from("admin_users").select("id, role").eq("user_id", id).maybeSingle();
    if (!row) return { ok: false as const, error: "직원 계정이 아닙니다." };
    if ((row as { role: string }).role === "super") return { ok: false as const, error: "최고 관리자 비밀번호는 여기서 바꿀 수 없습니다." };

    const password = tempPassword();
    const { error } = await db.auth.admin.updateUserById(id, { password });
    if (error) return { ok: false as const, error: `비밀번호 재설정 실패: ${error.message}` };

    await audit({
      action: "admin.password_reset",
      resource_type: "auth_user",
      resource_id: id,
      before: null,
      after: { reset: true }, // 비밀번호 값은 기록하지 않는다
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });
    return { ok: true as const, password };
  } catch (e) {
    return fail(e);
  }
}
