import { createClient } from "@/lib/supabase/server";
import { loadSheetSnapshot, sheetConfigured, todayKst } from "@/lib/sheet/source";
import { RentBoardClient, type CallLog } from "./board-client";

export const metadata = { title: "임대 현황" };
export const dynamic = "force-dynamic";

const KEEP_MONTHS = 12; // 화면엔 최근 12개월만 보낸다

export default async function RentBoardPage() {
  if (!sheetConfigured()) return <SetupGuide />;

  let snap: Awaited<ReturnType<typeof loadSheetSnapshot>>;
  try {
    snap = await loadSheetSnapshot();
  } catch (e) {
    return (
      <Shell>
        <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-900">
          <p className="font-semibold mb-1">구글 시트를 읽지 못했습니다</p>
          <p>{e instanceof Error ? e.message : String(e)}</p>
        </div>
      </Shell>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rent_call_logs")
    .select("id, unit_key, outcome, promise_date, memo, author_name, created_at")
    .order("created_at", { ascending: false })
    .limit(3000);

  const units = snap.units.map((u) => ({ ...u, months: u.months.slice(-KEEP_MONTHS) }));

  return (
    <RentBoardClient
      units={units}
      logs={(data ?? []) as CallLog[]}
      logsMissing={error?.code === "42P01"}
      today={todayKst()}
      sheetDate={snap.sheetDate}
      fetchedAt={snap.fetchedAt}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">임대 현황</h1>
      {children}
    </div>
  );
}

function SetupGuide() {
  return (
    <Shell>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 space-y-2">
        <p className="font-semibold">구글 시트 연결이 아직 안 됐습니다</p>
        <p>Vercel 환경변수에 <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_SA_EMAIL</code>,{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_SA_PRIVATE_KEY</code>,{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">DM_SHEET_ID</code> 를 넣고,
          DM-임대관리현황 시트를 서비스 계정 이메일에 <b>뷰어</b>로 공유하면 바로 보입니다.</p>
      </div>
    </Shell>
  );
}
