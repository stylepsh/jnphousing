"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Users2, ListPlus, AlertTriangle } from "lucide-react";
import { parseOwnerNames } from "@/lib/auction/search";
import { mergeCart } from "@/lib/auction/selection-cart";
import { useCart } from "@/lib/auction/use-cart";
import { displayOwnerName } from "@/lib/auction/court-auction";
import { cartItemsForOwnerNames, type BulkNameHit } from "./actions";

/**
 * 이름 일괄 검색 — 명단을 통째로 붙여넣어 여러 임대인을 한 번에 취합 바구니에 담는다.
 * 한 명씩 검색·체크하던 것을 한 번으로 줄인다. 못 찾은 이름은 따로 보여줘 오타를 잡는다.
 */
export function BulkNameSearch() {
  const { setCart } = useCart();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    hits: BulkNameHit[];
    notFound: string[];
    added: number;
  } | null>(null);

  const names = parseOwnerNames(text);

  function run() {
    if (names.length === 0) {
      toast.error("검색할 이름이 없습니다. 명단을 붙여넣어 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await cartItemsForOwnerNames(names);
      if (!res.ok || !res.items) {
        toast.error(res.error ?? "검색 실패");
        return;
      }
      setCart((prev) => mergeCart(prev, res.items!));
      setResult({ hits: res.hits ?? [], notFound: res.notFound ?? [], added: res.items.length });
      if (res.items.length === 0) toast.error("명단에서 찾은 미답사 물건이 없습니다");
      else
        toast.success(
          `${res.hits?.length ?? 0}명 · ${res.items.length}건을 바구니에 담았습니다`,
        );
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-bold flex items-center gap-1.5">
        <Users2 className="w-4 h-4 text-blue-600" /> 이름 일괄 검색
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        임대인 이름을 <strong>줄바꿈이나 쉼표로 여러 개</strong> 붙여넣으면 한 번에 찾아
        취합 바구니에 담습니다. 번호(1.)·괄호·&quot;외 2명&quot; 같은 꼬리표는 알아서 떼어냅니다.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"김철수\n박영희, 이민수\n1. 주식회사 한빛개발"}
        className="mt-2 w-full rounded-lg border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={run}
          disabled={pending || names.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-black disabled:opacity-40 min-h-11"
        >
          <ListPlus className="w-4 h-4" />
          {pending ? "찾는 중…" : `${names.length}명 찾아서 담기`}
        </button>
        {text && (
          <button
            onClick={() => {
              setText("");
              setResult(null);
            }}
            className="px-3 py-2 rounded-lg border text-sm font-bold text-muted-foreground hover:bg-muted min-h-11"
          >
            지우기
          </button>
        )}
        {names.length > 0 && (
          <span className="text-xs text-muted-foreground">
            인식된 이름 {names.length}개: {names.slice(0, 5).join(" · ")}
            {names.length > 5 ? ` 외 ${names.length - 5}개` : ""}
          </span>
        )}
      </div>

      {result && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="font-bold text-emerald-800">
            담음: 임대인 {result.hits.length}명 · {result.added.toLocaleString()}건
          </p>
          {result.hits.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {result.hits.map((h) => (
                <li
                  key={h.name}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-300 bg-emerald-50 font-bold text-emerald-800"
                  title={h.owners.join(" / ")}
                >
                  {displayOwnerName(h.name)} {h.count}건
                  {h.owners.length > 1 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-700">
                      <AlertTriangle className="w-3 h-3" /> 여러 명 일치
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {result.notFound.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2">
              <p className="font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> 못 찾은 이름 {result.notFound.length}개
                <span className="font-normal">— 오타이거나 아직 수집 안 된 임대인입니다</span>
              </p>
              <p className="mt-1 text-amber-900">{result.notFound.join(" · ")}</p>
            </div>
          )}
          <p className="text-muted-foreground">
            담긴 건은 화면 아래 취합 바에서 확인·수정하고 바로 발급할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
