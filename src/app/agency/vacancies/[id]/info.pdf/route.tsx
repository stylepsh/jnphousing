/**
 * 공실 매물 정보서 PDF — 부동산 회원 전용.
 *
 * GET /agency/vacancies/[id]/info.pdf
 * 보호: requireApprovedAgency (승인된 회원만)
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireApprovedAgency } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { VacancyInfoPdf } from "@/lib/pdf/vacancy-info";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import type { Vacancy, Property } from "@/types/database";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const agencyCtx = await requireApprovedAgency();
    const { id } = await ctx.params;

    const supabase = createServiceClient();
    const { data: vData } = await supabase
      .from("vacancies")
      .select("*, property:properties(name, address)")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();

    const v = vData as unknown as (Vacancy & {
      property: Pick<Property, "name" | "address"> | null;
    }) | null;
    if (!v) {
      return NextResponse.json({ error: "매물을 찾을 수 없습니다." }, { status: 404 });
    }

    const buf = await renderToBuffer(
      <VacancyInfoPdf
        data={{
          vacancy_id: v.id,
          property_name: v.property?.name ?? "—",
          property_address: v.property?.address ?? "—",
          unit_number: v.unit_number,
          floor: v.floor,
          area_pyeong: v.area_pyeong,
          area_m2: v.area_m2,
          room_count: v.room_count,
          bathroom_count: v.bathroom_count,
          deposit: v.deposit,
          monthly_rent: v.monthly_rent,
          maintenance_fee: v.maintenance_fee,
          move_in_date: v.move_in_date,
          description: v.description,
          image_url: v.images?.[0] ?? null,
          issued_at: new Date().toISOString(),
        }}
      />,
    );

    // 감사 로그 (다운로드 추적)
    void audit({
      action: "vacancy.info_pdf",
      resource_type: "vacancy",
      resource_id: id,
      after: { agency_id: agencyCtx.agency.id, company_name: agencyCtx.agency.company_name },
      actor_id: agencyCtx.user.id,
      actor_role: "agency",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      user_agent: req.headers.get("user-agent"),
    });

    const u8 = new Uint8Array(buf);
    const filename = `JNP_매물정보_${v.property?.name ?? "매물"}_${v.unit_number}.pdf`;
    return new NextResponse(u8 as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[vacancy info PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
