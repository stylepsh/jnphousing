import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { formatWon } from "@/lib/money";
import { normalizeOwnerName } from "@/lib/auction/court-auction";
import { BlockedOwners } from "../collection/blocked-owners";
import {
  listBlockedOwners,
  listBlockedProperties,
  type BlockedProperty,
} from "../collection/actions";

export const metadata: Metadata = { title: "차단 임대인" };
export const dynamic = "force-dynamic";

export default async function AuctionBlockedPage() {
  const [owners, props] = await Promise.all([listBlockedOwners(), listBlockedProperties()]);

  // 임대인별 묶기 (표기 흔들림은 정규화 키로 합침)
  const groups = new Map<string, { name: string; list: BlockedProperty[] }>();
  for (const p of props) {
    const k = normalizeOwnerName(p.owner_name) || p.owner_name;
    if (!groups.has(k)) groups.set(k, { name: p.owner_name, list: [] });
    groups.get(k)!.list.push(p);
  }
  const grouped = Array.from(groups.values()).sort((a, b) => b.list.length - a.list.length);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Ban}
        title="차단 임대인"
        accent="blue"
        desc={
          <>
            차단한 임대인의 물건은 <strong>수집은 되지만 답사 후보에서 빠져 이곳에 보관</strong>됩니다.
            전 지역이 한 번에 빠집니다(계양·서울·안산에 흩어져 있어도 임대인 단위). 해제하면 보관 물건이
            다시 답사 후보로 돌아갑니다.
          </>
        }
      />

      <BlockedOwners owners={owners} defaultOpen />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="차단 임대인" value={`${owners.length}명`} />
        <Stat label="보관 물건" value={`${props.length}건`} />
        <Stat
          label="보관 감정가 합계"
          value={formatWon(props.reduce((s, p) => s + (p.appraisal_value ?? 0), 0))}
        />
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          보관된 물건이 없습니다. 임대인을 차단하면 그 임대인의 물건이 이곳으로 옮겨집니다.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <details key={g.name} className="rounded-xl border bg-card">
              <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 text-sm font-bold">
                <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px] font-black">
                  {(g.name[0] ?? "?").toUpperCase()}
                </span>
                {g.name}
                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  {g.list.length}건
                </span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  감정가 {formatWon(g.list.reduce((s, p) => s + (p.appraisal_value ?? 0), 0))}
                </span>
              </summary>
              <ul className="divide-y border-t text-sm">
                {g.list.map((p) => (
                  <li key={p.id} className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">
                      {p.case_number}
                    </span>
                    <span className="flex-1 min-w-[200px]">{p.address}</span>
                    {p.creditor_type && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {p.creditor_type}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatWon(p.appraisal_value ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-black mt-0.5">{value}</p>
    </div>
  );
}
