"use server";

import { createServiceClient, createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activateLease } from "@/lib/billing/actions";
import { buildUnitNos } from "./unit-gen";

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
  floor_from: z.coerce.number().int().min(-5).max(99),
  floor_to: z.coerce.number().int().min(-5).max(99),
  per_floor: z.coerce.number().int().min(1).max(50),
  start_no: z.coerce.number().int().min(1).max(99).default(1),
  pad: z.coerce.number().int().min(1).max(3).default(2),
});

/**
 * 호실 일괄 생성 — 층 범위 × 층당 호실수로 자동 생성.
 * 예: 2층~13층, 층당 5호 → 201~205, 301~305, … 1301~1305 (총 60호). 최대 500개.
 * 건물 정보(주소·유형·관리유형·기본 보증금/월세) 자동 상속.
 */
export async function addUnitsBulk(ownerId: string, buildingId: string, fd: FormData) {
  try {
    await requireAdmin();
    const parsed = bulkSchema.safeParse({
      floor_from: fd.get("floor_from"), floor_to: fd.get("floor_to"),
      per_floor: fd.get("per_floor"), start_no: fd.get("start_no") || 1, pad: fd.get("pad") || 2,
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const { floor_from, floor_to, per_floor, start_no, pad } = parsed.data;

    const combos = buildUnitNos(floor_from, floor_to, per_floor, start_no, pad);
    if (combos.length === 0) return { ok: false as const, error: "생성할 호실이 없습니다." };
    if (combos.length > 500) return { ok: false as const, error: "한 번에 최대 500개까지 생성됩니다." };

    const building = await getBuilding(buildingId);
    if (!building) return { ok: false as const, error: "상위 건물을 찾을 수 없습니다." };

    // 중복 회피 — 기존 호번 조회
    const supabase = createServiceClient();
    const { data: existing } = await supabase.from("properties")
      .select("unit_no").eq("parent_building_id", buildingId).eq("unit_type", "unit");
    const existingSet = new Set(((existing ?? []) as { unit_no: string | null }[]).map((u) => u.unit_no));

    const rows = combos.filter((c) => !existingSet.has(c.unitNo)).map((c) => ({
      owner_id: ownerId, unit_type: "unit", parent_building_id: buildingId,
      name: `${building.name ?? ""} ${c.unitNo}`.trim(),
      address: building.address ?? "", type: building.type,
      unit_no: c.unitNo, floor: c.floor,
      service_modes: building.service_modes ?? [],
      deposit_default: building.deposit_default ?? 0,
      rent_default: building.rent_default ?? 0,
      management_fee_default: building.management_fee_default ?? 0,
    }));

    if (rows.length === 0) return { ok: false as const, error: "이미 모두 등록된 호실입니다." };

    const { error } = await supabase.from("properties").insert(rows);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const, count: rows.length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

const leaseSchema = z.object({
  tenant_id: z.string().uuid().optional().or(z.literal("")),
  tenant_name: z.string().max(100).optional().or(z.literal("")),
  tenant_phone: z.string().max(50).optional().or(z.literal("")),
  deposit: z.coerce.number().int().min(0).default(0),
  rent_amount: z.coerce.number().int().min(0).default(0),
  management_fee: z.coerce.number().int().min(0).default(0),
  start_date: z.string().min(1, "시작일 필수"),
  end_date: z.string().min(1, "종료일 필수"),
  rent_day: z.coerce.number().int().min(1).max(31).default(1),
});

/**
 * 공실 호실 → 임차계약 생성 + 수금 스케줄 자동 생성.
 * 임차인은 기존 선택 또는 신규(name+phone). 계약 생성 후 activateLease 로 스케줄 일괄 생성.
 * ※ leases.unit_id FK가 properties 를 가리켜야(마이그레이션 013) 신규 호실 계약 가능.
 */
export async function createLeaseForUnit(ownerId: string, unitId: string, fd: FormData) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(unitId).success) return { ok: false as const, error: "잘못된 호실" };

    const parsed = leaseSchema.safeParse({
      tenant_id: fd.get("tenant_id") || "", tenant_name: fd.get("tenant_name") || "",
      tenant_phone: fd.get("tenant_phone") || "",
      deposit: fd.get("deposit") || 0, rent_amount: fd.get("rent_amount") || 0,
      management_fee: fd.get("management_fee") || 0,
      start_date: fd.get("start_date"), end_date: fd.get("end_date"), rent_day: fd.get("rent_day") || 1,
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const d = parsed.data;
    if (d.end_date < d.start_date) return { ok: false as const, error: "종료일이 시작일보다 빠릅니다." };

    const supabase = createServiceClient();

    // 임차인: 기존 또는 신규
    let tenantId = d.tenant_id || "";
    if (!tenantId) {
      if (!d.tenant_name || !d.tenant_phone) return { ok: false as const, error: "신규 임차인은 이름·연락처가 필요합니다." };
      const { data: tRow, error: tErr } = await supabase
        .from("tenants").insert({ name: d.tenant_name, phone: d.tenant_phone }).select("id").single();
      if (tErr || !tRow) return { ok: false as const, error: tErr?.message ?? "임차인 생성 실패" };
      tenantId = (tRow as { id: string }).id;
    }

    // 계약 draft (수수료는 기본 정액 0 — 정산 탭에서 조정)
    const { data: lRow, error: lErr } = await supabase.from("leases").insert({
      lease_type: "long_term", unit_id: unitId, landlord_id: ownerId, tenant_id: tenantId,
      status: "draft", start_date: d.start_date, end_date: d.end_date,
      deposit: d.deposit, rent_amount: d.rent_amount, rent_cycle: "monthly", rent_day: d.rent_day,
      management_fee: d.management_fee, vat_included: false,
      fee_type: "fixed", fee_fixed: 0, fee_percent: null, overdue_annual_rate: 12,
    }).select("id").single();
    if (lErr || !lRow) return { ok: false as const, error: lErr?.message ?? "계약 생성 실패 (호실 FK 미배선이면 013 적용 필요)" };

    // 스케줄 자동 생성 + active 전환
    const act = await activateLease((lRow as { id: string }).id);
    if (!act.ok) return { ok: false as const, error: `계약은 생성됐으나 스케줄 생성 실패: ${act.error}` };

    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const, scheduled: act.count };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 건물 정보 수정 */
export async function updateBuilding(ownerId: string, id: string, fd: FormData) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const parsed = buildingSchema.safeParse({
      owner_id: ownerId,
      name: fd.get("name"), address: fd.get("address"), type: fd.get("type") || "villa",
      service_modes: parseModes(fd),
      deposit_default: fd.get("deposit_default") || 0,
      rent_default: fd.get("rent_default") || 0,
      management_fee_default: fd.get("management_fee_default") || 0,
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const { owner_id: _o, ...upd } = parsed.data;
    void _o;
    const supabase = createServiceClient();
    const { error } = await supabase.from("properties").update(upd).eq("id", id).eq("unit_type", "building");
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

const unitEditSchema = z.object({
  unit_no: z.string().min(1, "호수 필수").max(50),
  floor: z.coerce.number().int().optional().or(z.literal("")).transform((v) => (typeof v === "number" ? v : null)),
  deposit_default: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (typeof v === "number" ? v : null)),
  rent_default: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => (typeof v === "number" ? v : null)),
});

/** 호실 정보 수정 (호수·층·보증금·월세·관리유형) */
export async function updateUnit(ownerId: string, id: string, fd: FormData) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const parsed = unitEditSchema.safeParse({
      unit_no: fd.get("unit_no"), floor: fd.get("floor") || "",
      deposit_default: fd.get("deposit_default") || "", rent_default: fd.get("rent_default") || "",
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const modes = parseModes(fd);
    const supabase = createServiceClient();
    const upd: Record<string, unknown> = {
      unit_no: parsed.data.unit_no, floor: parsed.data.floor,
      deposit_default: parsed.data.deposit_default ?? 0, rent_default: parsed.data.rent_default ?? 0,
    };
    if (modes.length > 0) upd.service_modes = modes;
    const { error } = await supabase.from("properties").update(upd).eq("id", id).eq("unit_type", "unit");
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 호실 여러 개 일괄 삭제 (다중 선택). 계약이 걸린 호실은 FK 제약으로 건너뜀. */
export async function deletePropertiesBulk(ownerId: string, ids: string[]) {
  try {
    await requireAdmin();
    const valid = ids.filter((id) => z.string().uuid().safeParse(id).success);
    if (valid.length === 0) return { ok: false as const, error: "선택된 호실이 없습니다." };
    const supabase = createServiceClient();
    let deleted = 0;
    const failed: string[] = [];
    // 한 건씩 삭제해 계약 연결(FK) 등으로 실패한 호실만 골라낸다.
    for (const id of valid) {
      const { error } = await supabase.from("properties").delete().eq("id", id).eq("owner_id", ownerId);
      if (error) failed.push(id);
      else deleted++;
    }
    revalidatePath(`/admin/owners/${ownerId}`);
    if (deleted === 0) return { ok: false as const, error: "삭제 실패 — 계약이 연결된 호실은 먼저 계약을 해지하세요." };
    return { ok: true as const, count: deleted, failedCount: failed.length };
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
