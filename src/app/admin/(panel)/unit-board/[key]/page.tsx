import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadSheetSnapshot, sheetConfigured, todayKst } from "@/lib/sheet/source";
import { loadLedgers } from "@/lib/sheet/ledgers";
import { entriesForUnit, landlordHref, won } from "@/lib/sheet/links";
import { UnitDetail, type CallLog } from "../../rent-board/board-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const [, unit] = decodeURIComponent((await params).key).split("|");
  return { title: `호실 ${unit ?? ""}` };
}

export default async function UnitBoardPage({ params }: { params: Promise<{ key: string }> }) {
  if (!sheetConfigured()) notFound();
  const key = decodeURIComponent((await params).key);
  const supabase = await createClient();
  const [snap, ledgers, logsRes] = await Promise.all([
    loadSheetSnapshot(),
    loadLedgers(),
    supabase
      .from("rent_call_logs")
      .select("id, unit_key, outcome, promise_date, memo, author_name, created_at")
      .eq("unit_key", key)
      .order("created_at", { ascending: false }),
  ]);
  const u = snap.units.find((x) => x.key === key);
  if (!u) notFound();
  const ledger = ledgers.find((l) => l.landlord === u.landlord)?.ledger;
  const entries = entriesForUnit(u, ledger);
  const income = entries.reduce((s, e) => s + e.income, 0);
  const expense = entries.reduce((s, e) => s + e.expense, 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/landlord-board" className="hover:text-foreground">임대인</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={landlordHref(u.landlord)} className="hover:text-foreground">{u.landlord}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{u.building}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{u.unit}호</span>
      </nav>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{u.building} {u.unit}호</h1>
        <span className="rounded border px-2 py-0.5 text-sm">{u.status}</span>
        <span className="text-lg">{u.tenant || "임차인 없음"}</span>
        {u.unpaidAmount > 0 && <span className="text-red-700 font-semibold">미납 {u.unpaidMonths.length}개월 · {won(u.unpaidAmount)}</span>}
      </div>

      <div className="rounded-xl border bg-background">
        <UnitDetail u={u} logs={(logsRes.data ?? []) as CallLog[]} today={todayKst()} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          장부 거래{" "}
          <span className="text-sm font-normal text-muted-foreground">
            · {ledger ? `${u.landlord} 장부에서 이 호실 거래 ${entries.length}건 · 수입 ${won(income)} · 지출 ${won(expense)}` : "이 임대인은 장부 탭이 없습니다"}
          </span>
        </h2>
        {entries.length > 0 && (
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">날짜</th><th className="px-3 py-2 text-left">계정</th>
                  <th className="px-3 py-2 text-left">내용</th><th className="px-3 py-2 text-left">임차인</th><th className="px-3 py-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.row} className="border-t">
                    <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{e.dateText}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{e.account}</td>
                    <td className="px-3 py-1.5">{e.memo}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{e.tenant}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                      {e.income ? <span className="text-emerald-700">+{won(e.income)}</span> : <span className="text-red-700">−{won(e.expense)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
