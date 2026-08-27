import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { formatWon } from "@/lib/money";
import { BlockedOwners } from "../collection/blocked-owners";
import { BlockedProperties } from "./blocked-properties";
import { listBlockedOwners, listBlockedProperties } from "../collection/actions";

export const metadata: Metadata = { title: "차단 임대인" };
export const dynamic = "force-dynamic";

export default async function AuctionBlockedPage() {
  const [owners, props] = await Promise.all([listBlockedOwners(), listBlockedProperties()]);

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

      <BlockedProperties props={props} />
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
