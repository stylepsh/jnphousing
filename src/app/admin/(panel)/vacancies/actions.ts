"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const vacancySchema = z.object({
  property_id: z.string().uuid(),
  unit_number: z.string().min(1).max(20),
  floor: z.coerce.number().int().optional().nullable(),
  area_pyeong: z.coerce.number().positive().optional().nullable(),
  area_m2: z.coerce.number().positive().optional().nullable(),
  room_count: z.coerce.number().int().min(0).optional().nullable(),
  bathroom_count: z.coerce.number().int().min(0).optional().nullable(),
  deposit: z.coerce.number().int().min(0).default(0),
  monthly_rent: z.coerce.number().int().min(0).default(0),
  maintenance_fee: z.coerce.number().int().min(0).default(0),
  move_in_date: z.string().optional().or(z.literal("")).transform((v) => v || null),
  description: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
  status: z.enum(["available", "reserved", "contracted"]).default("available"),
  is_published: z.coerce.boolean().default(true),
});

export async function createVacancy(formData: FormData) {
  try {
    const raw = Object.fromEntries(formData.entries());
    const parsed = vacancySchema.parse({
      ...raw,
      is_published: raw.is_published === "on" || raw.is_published === "true",
    });
    const supabase = createServiceClient();
    const { error } = await supabase.from("vacancies").insert(parsed);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/vacancies");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { ok: false, error: msg };
  }
}

export async function updateVacancyStatus(id: string, status: "available" | "reserved" | "contracted") {
  const supabase = createServiceClient();
  const { error } = await supabase.from("vacancies").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/vacancies");
  return { ok: true };
}

export async function deleteVacancy(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("vacancies").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/vacancies");
  return { ok: true };
}
