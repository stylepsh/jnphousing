// 공실(survey_status='vacant') 상세 PDF 다운로드 — GET. 보호: requireAdmin.
import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { AuctionVacancyDetailPdf, type VacancyDetailItem } from "@/lib/pdf/auction-vacancy-detail-pdf";

interface Row {
  case_number: string;
  address: string;
  address_short: string | null;
  owner_name: string | null;
  creditor_type: string | null;
  category: string | null;
  door_code: string | null;
  meter_check: Record<string, string> | null;
  survey_memo: string | null;
  batch_id: string | null;
}

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const sb = createServiceClient();
    const { data } = await sb
      .from("auction_property")
      .select(
        "case_number, address, address_short, owner_name, creditor_type, category, door_code, meter_check, survey_memo, batch_id",
      )
      .eq("survey_status", "vacant")
      .order("owner_name", { ascending: true });
    const rows = (data ?? []) as Row[];

    const batchIds = Array.from(new Set(rows.map((r) => r.batch_id).filter((v): v is string => !!v)));
    const areaById = new Map<string, string>();
    if (batchIds.length > 0) {
      const { data: batches } = await sb.from("auction_survey_batch").select("id, area").in("id", batchIds);
      for (const b of (batches ?? []) as { id: string; area: string | null }[]) {
        if (b.area) areaById.set(b.id, b.area.replace(/\s*단기임대$/, "").trim());
      }
    }

    const items: VacancyDetailItem[] = rows.map((r) => ({
      owner_name: r.owner_name,
      region: r.batch_id ? areaById.get(r.batch_id) ?? "" : "",
      address: r.address_short ? `${r.address} [${r.address_short}]` : r.address,
      case_number: r.case_number === "(미상)" ? "" : r.case_number,
      category: r.category,
      creditor_type: r.creditor_type,
      mail: (r.meter_check && r.meter_check.mail) || "",
      meter: (r.meter_check && r.meter_check.meter) || "",
      door_code: r.door_code,
      memo: r.survey_memo,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const buf = await renderToBuffer(<AuctionVacancyDetailPdf data={{ printedAt: today, items }} />);
    const filename = `JNP_공실상세_${today}_${items.length}건.pdf`;
    return new NextResponse(new Uint8Array(buf) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[auction vacancy detail PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
