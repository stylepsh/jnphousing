/**
 * 계약 만료 30/60일 전 알림 cron (P26-67).
 *
 * Vercel Cron 등록 후 매일 09:00 실행.
 * 60일/30일/7일 차 임박 계약 → lease_expiry_alerts insert + messaging adapter 호출.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/messaging/adapter";

const CRON_SECRET = process.env.CRON_SECRET;

interface LeaseRow {
  id: string;
  end_date: string;
  tenant_id: string | null;
  landlord_id: string | null;
  rent_amount: number;
}

async function processLeaseExpiry(daysBefore: number) {
  const supabase = createServiceClient();
  const target = new Date();
  target.setDate(target.getDate() + daysBefore);
  const targetIso = target.toISOString().slice(0, 10);

  const { data: leases } = await supabase
    .from("leases")
    .select("id, end_date, tenant_id, landlord_id, rent_amount")
    .eq("status", "active")
    .eq("end_date", targetIso);

  const rows = (leases ?? []) as LeaseRow[];
  let processed = 0;

  for (const lease of rows) {
    try {
      // 이미 발송했는지 확인
      const { count } = await supabase
        .from("lease_expiry_alerts")
        .select("*", { count: "exact", head: true })
        .eq("lease_id", lease.id)
        .eq("days_before", daysBefore);
      if ((count ?? 0) > 0) continue;

      // 임차인·임대인 모두에게 mock 발송 (실 발송은 env 추가 시)
      const body = `[JNP주택관리] 계약 만료 ${daysBefore}일 전 안내. 계약 갱신 협의가 필요합니다. (만료일 ${lease.end_date})`;
      await sendMessage({ channel: "console", to: "tenant", body, metadata: { leaseId: lease.id } });
      await sendMessage({ channel: "console", to: "landlord", body, metadata: { leaseId: lease.id } });

      await supabase.from("lease_expiry_alerts").insert({
        lease_id: lease.id,
        days_before: daysBefore,
        channel: "console",
      });
      processed += 1;
    } catch (e) {
      console.warn("[cron.lease-expiry] error", lease.id, e);
    }
  }
  return processed;
}

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("x-cron-secret") ?? req.headers.get("authorization");
    if (!auth?.includes(CRON_SECRET)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const results = {
      d60: await processLeaseExpiry(60),
      d30: await processLeaseExpiry(30),
      d7:  await processLeaseExpiry(7),
      at:  new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
