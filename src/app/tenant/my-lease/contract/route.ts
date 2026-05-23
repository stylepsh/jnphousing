/**
 * 임차인 본인 계약서 다운로드 — presigned URL 5분 → 즉시 redirect.
 *
 * 보호:
 * - tenant_session 쿠키 검증 (lease_id 매칭)
 * - middleware 가 /tenant/my-* 보호하므로 쿠키 없으면 도달 X
 * - 추가로 server side 에서 lease.contract_file_path 존재 + lease.id == session.lease_id 검증
 */

import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-session";
import { createServiceClient } from "@/lib/supabase/server";
import { presignContractUrl } from "@/lib/pdf/storage";

export async function GET() {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.redirect(new URL("/tenant/login", "http://placeholder").toString(), 302);
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("leases")
    .select("contract_file_path")
    .eq("id", session.lease_id)
    .maybeSingle();
  const lease = data as { contract_file_path: string | null } | null;
  if (!lease?.contract_file_path) {
    return NextResponse.json({ ok: false, error: "등록된 계약서가 없습니다." }, { status: 404 });
  }

  const url = await presignContractUrl(session.lease_id, lease.contract_file_path);
  if (!url) {
    return NextResponse.json({ ok: false, error: "다운로드 링크 생성 실패" }, { status: 500 });
  }
  return NextResponse.redirect(url, 302);
}
