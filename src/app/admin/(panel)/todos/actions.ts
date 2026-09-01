"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const todoSchema = z.object({
  title: z.string().min(1, "할 일 내용을 입력하세요").max(2000),
  detail: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
  recorder: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  assignee: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
});

function revalidate() {
  revalidatePath("/admin/todos");
  revalidatePath("/admin/dashboard");
}

export async function addTodo(formData: FormData) {
  try {
    const ctx = await requireMutableAdmin();
    const parsed = todoSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };

    const supabase = createServiceClient();
    const { error } = await supabase.from("team_todos").insert({
      ...parsed.data,
      created_by: ctx.user.id,
    });
    if (error) return { ok: false as const, error: error.message };

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function toggleTodo(id: string, done: boolean) {
  return setTodoStatus(id, done ? "done" : "todo");
}

/** 상태 변경: 진행중(todo) / 지연(delayed) / 완료(done) */
export async function setTodoStatus(id: string, status: "todo" | "delayed" | "done") {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("team_todos")
      .update(status === "done"
        ? { status: "done", completed_at: new Date().toISOString() }
        : { status, completed_at: null })
      .eq("id", id);
    if (error) return { ok: false as const, error: error.message };

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 일정 변경 — 기한(due_date)만 수정하고 진행중으로 유지 */
export async function rescheduleTodo(id: string, dueDate: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false as const, error: "날짜 형식 오류" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("team_todos")
      .update({ due_date: dueDate || null, status: "todo", completed_at: null })
      .eq("id", id);
    if (error) return { ok: false as const, error: error.message };

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteTodo(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };

    const supabase = createServiceClient();
    const { error } = await supabase.from("team_todos").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };

    revalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
