"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, ChevronDown, Copy, X, User, FileSpreadsheet, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/auction/use-cart";
import { cartToText, groupCartByOwner, removeFromCart } from "@/lib/auction/selection-cart";
import { displayOwnerName } from "@/lib/auction/court-auction";
import { useIssueSheet } from "./use-issue-sheet";

/**
 * 취합 바구니 고정 바 — 임대인 명단이든 물건 목록이든 항상 화면 아래에 붙어 있다.
 * (예전에는 물건 목록 안에만 있어서, 명단 화면으로 나오면 몇 건 담았는지 보이지 않았다)
 */
export function CartBar({ recentTeams = [] }: { recentTeams?: string[] }) {
  const router = useRouter();
  const { cart, setCart } = useCart();
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState("");
  const { issue, issuing } = useIssueSheet();

  if (cart.length === 0) return null;
  const groups = groupCartByOwner(cart);

  async function send(kind: "pdf" | "xlsx") {
    const ok = await issue({
      ids: cart.map((c) => c.id),
      team,
      kind,
      label: groups[0]?.owner ?? "답사지",
    });
    if (!ok) return;
    setCart([]);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-6xl px-2 pb-2 pointer-events-auto">
        {open && (
          <div className="mb-1.5 rounded-xl border-2 border-emerald-300 bg-white shadow-lg">
            <div className="max-h-[45vh] overflow-y-auto divide-y">
              {groups.map(({ owner, items }) => (
                <div key={owner} className="p-2.5">
                  <p className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {displayOwnerName(owner)}
                    <span className="text-emerald-700">{items.length}건</span>
                    <button
                      onClick={() => setCart((c) => removeFromCart(c, items.map((i) => i.id)))}
                      className="ml-auto text-[11px] font-bold text-muted-foreground hover:text-red-600 px-2 py-1"
                    >
                      이 임대인 빼기
                    </button>
                  </p>
                  <ol className="mt-1 space-y-0.5">
                    {items.map((c, i) => (
                      <li key={c.id} className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground tabular-nums w-5 shrink-0">{i + 1}.</span>
                        <span className="truncate">{c.address}</span>
                        {c.case_number && (
                          <span className="text-muted-foreground shrink-0">({c.case_number})</span>
                        )}
                        <button
                          onClick={() => setCart((prev) => removeFromCart(prev, [c.id]))}
                          className="ml-auto text-muted-foreground hover:text-red-600 shrink-0 p-1"
                          title="빼기"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            {/* 발급 — 명단 화면에서도 바로 출력 */}
            <div className="flex items-center gap-1.5 border-t bg-emerald-50 p-2 flex-wrap">
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                list="cart-recent-teams"
                placeholder="받는 답사팀"
                className="px-2.5 py-2 rounded-lg border bg-white text-sm font-bold w-32 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="cart-recent-teams">
                {recentTeams.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {recentTeams.slice(0, 3).map((t) => (
                <button
                  key={t}
                  onClick={() => setTeam(t)}
                  className="px-2 py-2 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  {t}
                </button>
              ))}
              <button
                onClick={() => send("xlsx")}
                disabled={issuing}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-black disabled:opacity-40 min-h-11"
              >
                <FileSpreadsheet className="w-4 h-4" /> 엑셀 발급 ({cart.length})
              </button>
              <button
                onClick={() => send("pdf")}
                disabled={issuing}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-emerald-600 bg-white text-emerald-700 text-sm font-black disabled:opacity-40 min-h-11"
              >
                <Printer className="w-4 h-4" /> 인쇄
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-2.5 py-2 shadow-lg">
          <ClipboardList className="w-4 h-4 text-emerald-700 shrink-0" />
          <p className="text-sm font-black text-emerald-900 min-w-0 truncate">
            담김 {cart.length.toLocaleString()}건
            <span className="font-bold text-emerald-700 ml-1.5">· 임대인 {groups.length}명</span>
          </p>
          <button
            onClick={() => {
              navigator.clipboard
                .writeText(cartToText(cart))
                .then(() => toast.success("취합본을 복사했습니다"))
                .catch(() => toast.error("복사 실패 — 목록을 펼쳐 직접 선택해 주세요"));
            }}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-100 min-h-11"
            title="임대인별로 정리한 취합본을 클립보드에 복사"
          >
            <Copy className="w-3.5 h-3.5" /> 복사
          </button>
          <button
            onClick={() => {
              if (confirm(`담아둔 ${cart.length}건을 전부 비울까요?`)) setCart([]);
            }}
            className="px-2.5 py-2 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-muted-foreground hover:bg-emerald-100 min-h-11"
          >
            비우기
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 min-h-11"
          >
            발급·목록
            <ChevronDown className={cn("w-3.5 h-3.5 transition", open && "rotate-180")} />
          </button>
        </div>
      </div>
    </div>
  );
}
