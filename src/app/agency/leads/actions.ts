"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  vacancy_id: z.string().uuid(),
  tenant_name: z.string().min(1).max(50),
  tenant_phone: z.string().min(8).max(20),
  preferred_move_in: z.string().optional().or(z.literal("")).transform(v => v || null),
  budget_deposit: z.coerce.number().int().min(0).optional().or(z.literal("")).transform(v => (typeof v === "number" ? v : null)),
  budget_rent: z.coerce.number().int().min(0).optional().or(z.literal("")).transform(v => (typeof v === "number" ? v : null)),
  note: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
});

export async function submitLead(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, error: "로그인 필요" };

    const { data: agency } = await supabase.from("agencies").select("id, status").eq("user_id", user.id).maybeSingle();
    const a = agency as { id: string; status: string } | null;
    if (!a || a.status !== "approved") return { ok: false as const, error: "승인된 회원만 사용 가능" };

    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const service = createServiceClient();
    const { data: lead, error } = await service.from("agency_lead_requests").insert({
      ...parsed.data,
      agency_id: a.id,
    }).select("id").single();
    if (error) {
      console.warn("[submitLead]", error);
      return { ok: false as const, error: "저장 실패" };
    }

    await service.from("agency_activity_log").insert({
      agency_id: a.id,
      vacancy_id: parsed.data.vacancy_id,
      action: "inquiry_request",
      metadata: { lead_id: (lead as { id: string }).id },
    });

    revalidatePath("/agency/leads");
    return { ok: true as const, leadId: (lead as { id: string }).id };
  } catch (e) {
    console.warn("[submitLead] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
