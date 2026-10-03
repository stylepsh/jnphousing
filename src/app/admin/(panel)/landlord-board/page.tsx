import Link from "next/link";
import { loadSheetSnapshot, sheetConfigured } from "@/lib/sheet/source";
import { loadLedgers } from "@/lib/sheet/ledgers";
import { landlordHref, man } from "@/lib/sheet/links";

export const metadata = { title: "임대인" };
export const dynamic = "force-dynamic";

export default async function LandlordBoardPage() {
  if (!sheetConfigured()) return <p className="p-8 text-sm">구글 시트 연결이 아직 안 됐습니다. 임대 현황 화면의 안내를 확인하세요.</p>;
  const [snap, ledgers] = await Promise.all([loadSheetSnapshot(), loadLedgers()]);

  const names = [...new Set([...snap.units.map((u) => u.landlord).filter(Boolean), ...ledgers.map((l) => l.landlord)])];
  const cards = names
    .map((name) => {
      const units = snap.units.filter((u) => u.landlord === name);
      const occ = units.filter((u) => u.status === "입주");
      const lr = ledgers.find((l) => l.landlord === name);
      const recent = lr?.ledger?.months.find((m) => m.ym !== "날짜없음");
      return {
        name,
        buildings: [...new Set(units.map((u) => u.building.replace(/\(.*?\)/g, "")))].filter(Boolean),
        occ: occ.length,
        vacant: units.filter((u) => u.status === "상품").length,
        planned: units.filter((u) => u.status === "예정").length,
        closed: units.filter((u) => u.status === "종결").length,
        rent: occ.reduce((s, u) => s + u.rent, 0),
        owingN: occ.filter((u) => u.unpaidAmount > 0).length,
        owing: occ.reduce((s, u) => s + u.unpaidAmount, 0),
        lr,
        recent,
      };
    })
    .filter((c) => c.occ + c.vacant + c.planned > 0 || c.lr)
    .sort((a, b) => b.occ + b.vacant - (a.occ + a.vacant));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임대인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          경리 시트(ALL 탭 + 임대인별 장부 탭) 기준 · 시트 기준일 {snap.sheetDate} · 임대인을 누르면 건물·호실·장부·정산이 이어서 보입니다
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.name} href={landlordHref(c.name)} className="rounded-xl border bg-background p-4 hover:border-primary/50 hover:shadow-sm transition">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-bold">{c.name}</span>
              {c.owing > 0 && <span className="text-sm font-semibold text-red-700">미납 {c.owingN}세대 · {man(c.owing)}</span>}
            </div>
            <div className="mt-1 text-xs text-muted-foreground truncate">{c.buildings.join(" · ") || "ALL 탭에 호실 없음"}</div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
              <Mini label="입주" value={c.occ} />
              <Mini label="공실" value={c.vacant} tone={c.vacant ? "text-amber-700" : ""} />
              <Mini label="예정" value={c.planned} />
              <Mini label="종결" value={c.closed} tone="text-muted-foreground" />
            </div>
            <div className="mt-3 text-sm space-y-0.5">
              <div>한 달 월세 <b className="tabular-nums">{man(c.rent)}</b></div>
              {!c.lr ? (
                <div className="text-xs text-muted-foreground">임대인 장부 탭 없음</div>
              ) : c.lr.error ? (
                <div className="text-xs text-amber-700">장부 읽기 실패: {c.lr.error}</div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">정산 방식: {c.lr.rule}</div>
                  <div className="text-xs text-muted-foreground">
                    장부 {c.lr.ledger?.asOfText || "기준일 없음"}
                    {c.recent && ` · ${Number(c.recent.ym.slice(5))}월 수입 ${man(c.recent.income)} · 지출 ${man(c.recent.expense)}${c.recent.payout ? ` · 지급 ${man(c.recent.payout)}` : ""}`}
                  </div>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md bg-muted/40 py-1.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
