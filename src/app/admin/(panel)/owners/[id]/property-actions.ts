"use server";

import { createServiceClient, createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MODE_VALUES = ["housing_mgmt", "rental_consigned", "dm"] as const;
const TYPE_VALUES = ["villa", "apartment", "officetel", "commercial"] as const;

const buildingSchema = z.object({
  owner_id: z.string().uuid(),
  name: z.string().min(1, "건물명 필수").max(200),
  address: z.string().min(1, "주소 필수").max(300),
  type: z.enum(TYPE_VALUES).default("villa"),
  service_modes: z.array(z.enum(MODE_VALUES)).default([]),
  deposit_default: z.coerce.number().int().min(0).default(0),
  rent_default: z.coerce.number().int().min(0).default(0),
  management_fee_default: z.coerce.number().int().min(0).default(0),
});

function parseModes(fd: FormData): string[] {
  return fd.getAll("service_modes").map(String).filter((m) => (MODE_VALUES as readonly string[]).includes(m));
}

/** 건물 등록 — owner_id 직접 연결, unit_type='building' */
export async function createBuilding(ownerId: string, fd: FormData) {
  try {
    await requireAdmin();
    const parsed = buildingSchema.safeParse({
      owner_id: ownerId,
      name: fd.get("name"), address: fd.get("address"), type: fd.get("type") || "villa",
      service_modes: parseModes(fd),
      deposit_default: fd.get("deposit_default") || 0,
      rent_default: fd.get("rent_default") || 0,
      management_fee_default: fd.get("management_fee_default") || 0,
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };

    const supabase = createServiceClient();
    const { error } = await supabase.from("properties").insert({ ...parsed.data, unit_type: "building" });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

const unitSchema = z.object({
  unit_no: z.string().min(1, "호수 필수").max(50),
  floor: z.coerce.number().int().optional().or(z.literal("")).transform((v) => (typeof v === "number" ? v : null)),
  deposit_default: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (typeof v === "number" ? v : null)),
  rent_default: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (typeof v === "number" ? v : null)),
});

/** 상위 건물 정보 조회(상속용). buildingId 없으면 null */
async function getBuilding(buildingId: string | null) {
  if (!buildingId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name, address, type, service_modes, deposit_default, rent_default, management_fee_default")
    .eq("id", buildingId).eq("unit_type", "building").maybeSingle();
  return data as {
    id: string; name: string | null; address: string | null; type: string;
    service_modes: string[] | null; deposit_default: number | null;
    rent_default: number | null; management_fee_default: number | null;
  } | null;
}

/** 호실 1건 추가 — 건물 있으면 주소/유형/관리유형/기본값 상속, 단독이면 직접 입력 */
export async function addUnit(ownerId: string, buildingId: string | null, fd: FormData) {
  try {
    await requireAdmin();
    const parsed = unitSchema.safeParse({
      unit_no: fd.get("unit_no"), floor: fd.get("floor") || "",
      deposit_default: fd.get("deposit_default") || "", rent_default: fd.get("rent_default") || "",
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };

    const building = await getBuilding(buildingId);
    // 단독 호실: 주소/유형/관리유형 직접 입력
    const address = building?.address ?? String(fd.get("address") ?? "").trim();
    if (!address) return { ok: false as const, error: "주소 필수(단독 호실은 주소 입력)" };
    const type = building?.type ?? (String(fd.get("type") || "villa"));
    const modes = building?.service_modes ?? parseModes(fd);
    const baseName = building?.name ?? "";

    const supabase = createServiceClient();
    const { error } = await supabase.from("properties").insert({
      owner_id: ownerId, unit_type: "unit", parent_building_id: buildingId,
      name: `${baseName} ${parsed.data.unit_no}`.trim(), address, type,
      unit_no: parsed.data.unit_no, floor: parsed.data.floor,
      service_modes: modes,
      deposit_default: parsed.data.deposit_default ?? building?.deposit_default ?? 0,
      rent_default: parsed.data.rent_default ?? building?.rent_default ?? 0,
      management_fee_default: building?.management_fee_default ?? 0,
    });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

const bulkSchema = z.object({
  start: z.coerce.number().int().min(0),
  end: z.coerce.number().int().min(0),
  prefix: z.string().max(20).optional().or(z.literal("")),
  suffix: z.string().max(20).optional().or(z.literal("")),
  floor: z.coerce.number().int().optional().or(z.literal("")).transform((v) => (typeof v === "number" ? v : null)),
});

/** 호실 일괄 생성 — 범위(start~end) → 여러 호실. 건물 정보 상속. 최대 300개. */
export async function addUnitsBulk(ownerId: string, buildingId: string, fd: FormData) {
  try {
    await requireAdmin();
    const parsed = bulkSchema.safeParse({
      start: fd.get("start"), end: fd.get("end"),
      prefix: fd.get("prefix") || "", suffix: fd.get("suffix") || "", floor: fd.get("floor") || "",
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const { start, end, prefix, suffix, floor } = parsed.data;
    if (end < start) return { ok: false as const, error: "끝 호수가 시작보다 작습니다." };
    if (end - start + 1 > 300) return { ok: false as const, error: "한 번에 최대 300개까지 생성됩니다." };

    const building = await getBuilding(buildingId);
    if (!building) return { ok: false as const, error: "상위 건물을 찾을 수 없습니다." };

    const rows = [];
    for (let n = start; n <= end; n++) {
      const unitNo = `${prefix ?? ""}${n}${suffix ?? ""}`;
      rows.push({
        owner_id: ownerId, unit_type: "unit", parent_building_id: buildingId,
        name: `${building.name ?? ""} ${unitNo}`.trim(),
        address: building.address ?? "", type: building.type,
        unit_no: unitNo, floor,
        service_modes: building.service_modes ?? [],
        deposit_default: building.deposit_default ?? 0,
        rent_default: building.rent_default ?? 0,
        management_fee_default: building.management_fee_default ?? 0,
      });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("properties").insert(rows);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const, count: rows.length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 물건(건물/호실) 삭제. 건물 삭제 시 하위 호실의 parent는 FK on delete set null. */
export async function deleteProperty(ownerId: string, id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
