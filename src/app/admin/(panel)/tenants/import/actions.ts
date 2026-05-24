"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const rowSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().min(8).max(20),
  emergency_contact: z.string().max(20).optional().or(z.literal("")).transform(v => v || null),
  emergency_relation: z.string().max(20).optional().or(z.literal("")).transform(v => v || null),
  address: z.string().max(200).optional().or(z.literal("")).transform(v => v || null),
  memo: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
});

export async function bulkImportTenants(rows: Record<string, string>[]) {
  try {
    await requireAdmin();
    const valid: z.infer<typeof rowSchema>[] = [];
    for (const r of rows) {
      const parsed = rowSchema.safeParse(r);
      if (parsed.success) valid.push(parsed.data);
    }
    if (valid.length === 0) return { ok: false as const, error: "유효한 행이 없습니다." };

    const service = createServiceClient();
    const { error, count } = await service.from("tenants").insert(valid, { count: "exact" });
    if (error) {
      console.warn("[bulkImportTenants]", error);
      return { ok: false as const, error: error.message };
    }
    revalidatePath("/admin/tenants");
    return { ok: true as const, inserted: count ?? valid.length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
