"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ALLOWED_STATUS = ["paid", "waived", "overdue", "unpaid"] as const;

export async function bulkUpdateInvoiceStatus(ids: string[], status: string) {
  try {
    await requireAdmin();
    const validIds = ids.filter(id => z.string().uuid().safeParse(id).success);
    if (validIds.length === 0) return { ok: false as const, error: "유효한 ID 없음" };
    if (!(ALLOWED_STATUS as readonly string[]).includes(status)) return { ok: false as const, error: "허용되지 않는 상태" };

    const service = createServiceClient();
    const { error, count } = await service.from("rent_invoices").update({ status }).in("id", validIds).select("id", { count: "exact", head: true });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/rent");
    revalidatePath("/admin/rent/bulk");
    return { ok: true as const, updated: count ?? validIds.length };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}
