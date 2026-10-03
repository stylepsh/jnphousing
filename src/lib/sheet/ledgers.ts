import "server-only";
import { unstable_cache } from "next/cache";
import { LEDGER_TABS, parseLedger, type Ledger } from "./ledger-parser";
import { fetchGrid, SHEET_TAG } from "./source";

export type LedgerResult = { tab: string; landlord: string; rule: string } & ({ ledger: Ledger; error?: never } | { ledger?: never; error: string });

/** 임대인 장부 탭 전부. 탭 하나가 실패해도 나머지는 보여준다. 5분 캐시. */
export const loadLedgers = unstable_cache(
  async (): Promise<LedgerResult[]> =>
    Promise.all(
      LEDGER_TABS.map(async (t) => {
        try {
          return { ...t, ledger: parseLedger(await fetchGrid(t.tab), t.tab, t.landlord, t.rule) };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Apps Script v1 은 tab 파라미터를 무시하고 ALL 을 돌려줘서 헤더를 못 찾는다
          return { ...t, error: msg.includes("거래 헤더") ? `${msg} (시트 Apps Script를 v2로 갱신해야 할 수 있습니다)` : msg };
        }
      }),
    ),
  ["dm-ledgers-v1"],
  { revalidate: 300, tags: [SHEET_TAG] },
);
