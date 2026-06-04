"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/auth-guard";

const schema = z.object({
  building_address: z.string().min(3, "건물 주소를 입력해 주세요.").max(200),
  phone: z.string().min(9, "연락처를 확인해 주세요.").max(20).regex(/^[0-9\-+\s]+$/, "숫자·하이픈만 입력해 주세요."),
});

export type LeadResult = { ok: true } | { ok: false; error: string };

/** 경매 랜딩 인라인 폼 → inquiries(관리문의)로 접수. building_type='경매' 마커. */
export async function submitAuctionLead(formData: FormData): Promise<LeadResult> {
  const ip = await getClientIp();
  const rl = rateLimit(`auction-lead:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: `너무 많은 요청입니다. ${rl.retryAfterSeconds}초 후 다시 시도해 주세요.` };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("inquiries").insert({
      contact_name: "경매 상담 요청",
      phone: parsed.data.phone,
      building_address: parsed.data.building_address,
      building_type: "경매",
      message: "경매 건물 전문 서비스 랜딩 페이지 문의 — 검토 후 연락 요청",
    });
    if (error) {
      console.error("[submitAuctionLead]", error);
      return { ok: false, error: "접수 실패 — 잠시 후 다시 시도해 주세요." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[submitAuctionLead] unhandled", e);
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}
