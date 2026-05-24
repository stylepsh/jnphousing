/**
 * 임대인 월간 보고서 자동 생성 + 카톡 정산 알림 (P29-91, P29-92).
 *
 * 매월 1일 03:00 실행 (vercel.json cron).
 * - 지난달 정산 데이터로 landlord_reports 행 생성
 * - landlord 가 등록된 카톡/이메일 채널로 발송
 * - landlord_report_dispatches 에 발송 이력 기록
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/messaging/adapter";

const CRON_SECRET = process.env.CRON_SECRET;

interface LandlordRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("x-cron-secret") ?? req.headers.get("authorization");
    if (!auth?.includes(CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodStart = lastMonth.toISOString().slice(0, 10);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const periodLabel = `${lastMonth.getFullYear()}년 ${lastMonth.getMonth() + 1}월`;

    const { data: landlords } = await supabase.from("landlords").select("id, name, phone, email");
    const list = (landlords ?? []) as LandlordRow[];

    let sentCount = 0;
    for (const lord of list) {
      try {
        // 해당 월 정산 데이터 요약
        const { data: invs } = await supabase
          .from("rent_invoices")
          .select("amount_total, paid_total, status, leases!inner(landlord_id)")
          .eq("leases.landlord_id", lord.id)
          .gte("due_date", periodStart)
          .lte("due_date", periodEnd);
        const rows = (invs ?? []) as { amount_total: number; paid_total: number; status: string }[];

        const totalCharged = rows.reduce((s, r) => s + r.amount_total, 0);
        const totalPaid = rows.reduce((s, r) => s + r.paid_total, 0);
        const collectionRate = totalCharged > 0 ? Math.round(totalPaid / totalCharged * 100) : 0;

        const body = [
          `[JNP주택관리] ${periodLabel} 정산 보고서 도착`,
          ``,
          `${lord.name} 임대인님,`,
          `· 청구 합계: ${totalCharged.toLocaleString()}원`,
          `· 수금 합계: ${totalPaid.toLocaleString()}원`,
          `· 수금률: ${collectionRate}%`,
          ``,
          `자세한 내역은 임대인 포털에서 확인해 주세요.`,
          `https://jnphousing.co.kr/landlord/reports`,
        ].join("\n");

        // 카톡 → SMS → console 순으로 폴백
        let result = await sendMessage({ channel: "kakao", to: lord.phone ?? "", subject: `${periodLabel} 정산 보고서`, body, metadata: { landlordId: lord.id } });
        if (!result.ok || result.mockMode) {
          if (lord.phone) result = await sendMessage({ channel: "sms", to: lord.phone, subject: "정산 보고서", body, metadata: { landlordId: lord.id } });
        }
        if (lord.email) {
          await sendMessage({ channel: "email", to: lord.email, subject: `${periodLabel} 정산 보고서`, body, metadata: { landlordId: lord.id } });
        }

        await supabase.from("landlord_report_dispatches").insert({
          landlord_id: lord.id,
          channel: result.channel,
          status: result.ok ? "sent" : "failed",
        });
        sentCount += result.ok ? 1 : 0;
      } catch (e) {
        console.warn("[cron.landlord-monthly]", lord.id, e);
      }
    }

    return NextResponse.json({ ok: true, processed: list.length, sent: sentCount, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
