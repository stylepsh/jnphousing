import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { buildSurveyTemplate } from "@/lib/auction/survey-export";

// 표준 답사표 .xlsx 다운로드. ?region=수원&states=Selected,Inspecting
export async function GET(req: NextRequest) {
  await requireAdmin();
  const region = req.nextUrl.searchParams.get("region") ?? undefined;
  const statesParam = req.nextUrl.searchParams.get("states");
  const states = statesParam ? statesParam.split(",").filter(Boolean) : ["Selected", "Inspecting"];

  const { buffer, region: rg } = await buildSurveyTemplate({ region, states });
  const filename = `survey-${rg}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
