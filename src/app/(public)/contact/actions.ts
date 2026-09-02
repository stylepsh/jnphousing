"use server";

import { z } from "zod";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/auth-guard";

const schema = z.object({
  company_name: z.string().max(80).optional().or(z.literal("")),
  contact_name: z.string().min(2).max(40),
  phone: z.string().min(9).max(20).regex(/^[0-9\-+\s]+$/),
  email: z.string().email().optional().or(z.literal("")),
  building_address: z.string().min(5).max(200),
  building_type: z.string().max(40).optional(),
  total_units: z.union([z.string(), z.number()]).optional().transform((v) => (v === "" || v == null ? null : Number(v))),
  message: z.string().min(10).max(2000),
});

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function submitContact(formData: FormData): Promise<ContactResult> {
  // IP rate limit — 5건 / 10분
  const ip = await getClientIp();
  const rl = rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: `너무 많은 요청입니다. ${rl.retryAfterSeconds}초 후 다시 시도해 주세요.` };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };

  // Supabase 미설정(로컬/프리뷰)에서는 mock 클라이언트가 error:null 을 돌려주기 때문에
  // 저장이 안 됐는데도 "접수 완료"가 표시된다. 저장 경로가 없으면 성공으로 응답하지 않는다.
  if (!isSupabaseConfigured()) {
    console.error("[submitContact] Supabase 미설정 — 접수 저장 불가");
    return { ok: false, error: "접수 시스템이 일시적으로 연결되지 않았습니다. 전화로 문의해 주세요." };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("inquiries").insert({
      company_name: parsed.data.company_name || null,
      contact_name: parsed.data.contact_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      building_address: parsed.data.building_address,
      building_type: parsed.data.building_type || null,
      total_units: parsed.data.total_units,
      message: parsed.data.message,
    });
    if (error) {
      console.error("[submitContact]", error);
      return { ok: false, error: "접수 실패" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[submitContact] unhandled", e);
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}
