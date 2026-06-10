"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const todoSchema = z.object({
  title: z.string().min(1, "할 일 내용을 입력하세요").max(300),
  detail: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
  assignee: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
});

function revalidate() {
  revalidatePath("/admin/todos");
  revalidatePath("/admin/dashboard");
}

export async function addTodo(formData: FormData) {
  try {
    const ctx = await requireAdmin();
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
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("team_todos")
      .update(done
        ? { status: "done", completed_at: new Date().toISOString() }
        : { status: "todo", completed_at: null })
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
    await requireAdmin();
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
