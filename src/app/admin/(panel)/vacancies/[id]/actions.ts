"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin, getClientIp } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";

/* ============ 이미지 ============ */

export async function addVacancyImages(
  vacancyId: string,
  urls: { url: string; caption?: string | null }[],
) {
  try {
    const ctx = await requireMutableAdmin();
    if (!z.string().uuid().safeParse(vacancyId).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    if (!Array.isArray(urls) || urls.length === 0) {
      return { ok: false as const, error: "이미지가 없습니다." };
    }
    if (urls.length > 50) {
      return { ok: false as const, error: "한 번에 최대 50장까지 추가 가능합니다." };
    }
    const supabase = createServiceClient();

    // 기존 max display_order 조회
    const { data: lastOrder } = await supabase
      .from("vacancy_images")
      .select("display_order")
      .eq("vacancy_id", vacancyId)
      .order("display_order", { ascending: false })
      .limit(1);
    const base = ((lastOrder as { display_order: number }[] | null)?.[0]?.display_order ?? -1) + 1;

    const rows = urls.map((u, i) => ({
      vacancy_id: vacancyId,
      url: u.url,
      caption: u.caption ?? null,
      display_order: base + i,
      uploaded_by: ctx.user.id,
    }));

    const { error } = await supabase.from("vacancy_images").insert(rows);
    if (error) {
      console.error("[addVacancyImages]", error);
      return { ok: false as const, error: "저장 실패" };
    }

    void audit({
      action: "vacancy.image.add",
      resource_type: "vacancy",
      resource_id: vacancyId,
      after: { count: rows.length },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidatePath(`/admin/vacancies/${vacancyId}`);
    return { ok: true as const, added: rows.length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteVacancyImage(imageId: string) {
  try {
    const ctx = await requireMutableAdmin();
    if (!z.string().uuid().safeParse(imageId).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { data: row } = await supabase.from("vacancy_images").select("vacancy_id, url").eq("id", imageId).maybeSingle();
    const r = row as { vacancy_id?: string; url?: string } | null;

    const { error } = await supabase.from("vacancy_images").delete().eq("id", imageId);
    if (error) {
      console.error("[deleteVacancyImage]", error);
      return { ok: false as const, error: "삭제 실패" };
    }

    // Storage 파일도 정리 (best-effort) — vacancy-images 버킷의 path 추출
    if (r?.url) {
      const m = r.url.match(/\/vacancy-images\/([^?]+)/);
      if (m?.[1]) {
        await supabase.storage.from("vacancy-images").remove([decodeURIComponent(m[1])]);
      }
    }

    void audit({
      action: "vacancy.image.delete",
      resource_type: "vacancy",
      resource_id: r?.vacancy_id ?? null,
      before: { image_id: imageId },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    if (r?.vacancy_id) revalidatePath(`/admin/vacancies/${r.vacancy_id}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/* ============ 광고 채널 등록 ============ */

const listingSchema = z.object({
  vacancy_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  listing_url: z.string().url().optional().or(z.literal("")).transform((v) => v || null),
  listed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inquiry_count: z.coerce.number().int().min(0).default(0),
  status: z.enum(["active", "closed", "contracted"]).default("active"),
  notes: z.string().max(500).optional().or(z.literal("")).transform((v) => v || null),
});

export async function upsertListing(id: string | null, formData: FormData) {
  try {
    const ctx = await requireMutableAdmin();
    const raw = Object.fromEntries(formData.entries());
    const parsed = listingSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();
    if (id) {
      const { error } = await supabase.from("vacancy_ad_listings").update(parsed.data).eq("id", id);
      if (error) return { ok: false as const, error: "수정 실패" };
    } else {
      const { error } = await supabase.from("vacancy_ad_listings").insert({
        ...parsed.data,
        created_by: ctx.user.id,
      });
      if (error) {
        if (String(error.message).includes("duplicate")) {
          return { ok: false as const, error: "이미 같은 일자에 같은 채널로 등록된 항목이 있습니다." };
        }
        return { ok: false as const, error: "등록 실패" };
      }
    }

    void audit({
      action: id ? "listing.update" : "listing.create",
      resource_type: "vacancy_ad_listing",
      resource_id: id,
      after: parsed.data,
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
    });

    revalidatePath(`/admin/vacancies/${parsed.data.vacancy_id}`);
    revalidatePath("/admin/channels");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteListing(id: string, vacancyId: string) {
  try {
    await requireMutableAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("vacancy_ad_listings").delete().eq("id", id);
    if (error) return { ok: false as const, error: "삭제 실패" };
    revalidatePath(`/admin/vacancies/${vacancyId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
