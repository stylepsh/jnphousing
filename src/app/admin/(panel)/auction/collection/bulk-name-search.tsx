"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Users2, ListPlus, AlertTriangle, Copy, FileSpreadsheet, ArrowUpDown } from "lucide-react";
import { parseSearchNames } from "@/lib/auction/bulk-name-match";
import { mergeCart } from "@/lib/auction/selection-cart";
import { useCart } from "@/lib/auction/use-cart";
import { displayOwnerName } from "@/lib/auction/court-auction";
import { formatWonMan } from "@/lib/money";
import { bulkNameSearch, type BulkSearchGroup, type BulkSearchRow } from "./actions";

/**
 * 이름 일괄 검색 — 명단을 통째로 붙여넣어 임대인별 미답사 물건을 한 번에 찾는다.
 * 한 명씩 검색하고 발급하던 것을 한 번으로 줄이는 게 목적.
 * 못 찾은 이름은 오타 후보와 같이 보여줘 명단을 고칠 수 있게 한다.
 */

type SortKey =
  | "owner_name"
  | "tenant_name"
  | "address"
  | "category"
  | "deposit"
  | "monthly_rent"
  | "move_in_date"
  | "lease_end"
  | "case_number";

const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "owner_name", label: "소유주" },
  { key: "tenant_name", label: "임차인" },
  { key: "address", label: "주소" },
  { key: "category", label: "분류" },
  { key: "deposit", label: "보증금", num: true },
  { key: "monthly_rent", label: "월세", num: true },
  { key: "move_in_date", label: "입주일" },
  { key: "lease_end", label: "만기일" },
  { key: "case_number", label: "사건번호" },
];

function cell(r: BulkSearchRow, key: SortKey): string {
  const v = r[key];
  if (v === null || v === "") return "—";
  if (key === "deposit" || key === "monthly_rent") return formatWonMan(Number(v));
  return String(v);
}

function sortRows(rows: BulkSearchRow[], key: SortKey | null, asc: boolean): BulkSearchRow[] {
  if (!key) return rows;
  const num = key === "deposit" || key === "monthly_rent";
  return [...rows].sort((a, b) => {
    const av = a[key] ?? (num ? -1 : "");
    const bv = b[key] ?? (num ? -1 : "");
    const d = num ? Number(av) - Number(bv) : String(av).localeCompare(String(bv), "ko");
    return asc ? d : -d;
  });
}

export function BulkNameSearch() {
  const { setCart } = useCart();
  const [text, setText] = useState("");
  const [partial, setPartial] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<{ key: SortKey | null; asc: boolean }>({ key: null, asc: true });
  const [result, setResult] = useState<{
    groups: BulkSearchGroup[];
    notFound: { name: string; similar: string[] }[];
  } | null>(null);

  const names = useMemo(() => parseSearchNames(text), [text]);

  const summary = useMemo(() => {
    const rows = (result?.groups ?? []).flatMap((g) => g.rows);
    // 한 물건이 소유주·임차인 양쪽 이름으로 두 번 걸릴 수 있어 합계는 물건 기준으로 센다.
    const all = Array.from(new Map(rows.map((r) => [r.id, r])).values());
    return {
      total: all.length,
      rent: all.reduce((s, r) => s + (r.monthly_rent ?? 0), 0),
      deposit: all.reduce((s, r) => s + (r.deposit ?? 0), 0),
      items: all.map((r) => ({
        id: r.id,
        owner_name: r.owner_name,
        address: r.address,
        case_number: r.case_number,
      })),
    };
  }, [result]);

  function run() {
    if (names.length === 0) {
      toast.error("검색할 이름이 없습니다. 명단을 붙여넣어 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await bulkNameSearch(names, { partial });
      if (!res.ok || !res.groups) {
        toast.error(res.error ?? "검색 실패");
        return;
      }
      setResult({ groups: res.groups, notFound: res.notFound ?? [] });
      const found = res.groups.reduce((s, g) => s + g.rows.length, 0);
      if (found === 0) toast.error("명단에서 찾은 미답사 물건이 없습니다");
      else toast.success(`${res.groups.length}명 · ${found}건 찾았습니다`);
    });
  }

  function addAll() {
    if (summary.items.length === 0) return;
    setCart((prev) => mergeCart(prev, summary.items));
    toast.success(`${summary.items.length}건을 취합 바구니에 담았습니다`);
  }

  function copyTsv() {
    const head = ["검색이름", "매칭칸", ...COLUMNS.map((c) => c.label)].join("\t");
    const body = (result?.groups ?? []).flatMap((g) =>
      g.rows.map((r) =>
        [
          g.name,
          r.field === "owner" ? "소유주" : "임차인",
          ...COLUMNS.map((c) => cell(r, c.key)),
        ].join("\t"),
      ),
    );
    navigator.clipboard.writeText([head, ...body].join("\n"));
    toast.success(`${body.length}줄을 복사했습니다 (엑셀에 바로 붙여넣기)`);
  }

  async function exportXlsx() {
    const res = await fetch("/admin/auction/collection/bulk-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names, partial }),
    });
    if (!res.ok) {
      toast.error("엑셀 생성 실패");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `이름일괄검색_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-bold flex items-center gap-1.5">
        <Users2 className="w-4 h-4 text-blue-600" /> 이름 일괄 검색
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        이름을 <strong>줄바꿈이나 쉼표로 여러 개</strong> 붙여넣으면 미답사 물건을 한 번에 찾습니다.
        소유주·임차인 칸을 모두 보고, 공백과 ㈜·(주) 표기는 무시합니다. 번호(1.)·&quot;외 2명&quot;
        꼬리표는 떼고, <strong>괄호 안 이름도 따로 찾습니다</strong>.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"김철수\n박영희, 이민수\n최효준(이승연)\n1. ㈜파크앤시티"}
        className="mt-2 w-full rounded-lg border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={run}
          disabled={pending || names.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-black disabled:opacity-40 min-h-11"
        >
          <ListPlus className="w-4 h-4" />
          {pending ? "찾는 중…" : `이름 ${names.length}개 검색`}
        </button>
        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={partial}
            onChange={(e) => setPartial(e.target.checked)}
            className="w-4 h-4"
          />
          부분 일치 포함
        </label>
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
        <div className="mt-3 space-y-3 text-xs">
          {/* 요약 + 결과 활용 */}
          <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-muted/40 p-2">
            <span className="font-black text-emerald-800">
              임대인 {result.groups.length}명 · {summary.total.toLocaleString()}건
            </span>
            <span className="text-muted-foreground">
              월세 합계 {formatWonMan(summary.rent)} · 보증금 합계 {formatWonMan(summary.deposit)}
            </span>
            <span className="flex-1" />
            <button
              onClick={addAll}
              disabled={summary.total === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-bold disabled:opacity-40"
            >
              <ListPlus className="w-3.5 h-3.5" /> 전부 바구니에 담기
            </button>
            <button
              onClick={copyTsv}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border font-bold hover:bg-muted"
            >
              <Copy className="w-3.5 h-3.5" /> 결과 복사
            </button>
            <button
              onClick={exportXlsx}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border font-bold hover:bg-muted"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> 엑셀로 내보내기
            </button>
          </div>

          {/* 결과 표 — 이름별 그룹 */}
          {result.groups.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold w-14">칸</th>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        onClick={() => toggleSort(c.key)}
                        className={`px-2 py-1.5 font-bold cursor-pointer select-none hover:bg-muted ${
                          c.num ? "text-right" : "text-left"
                        }`}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {c.label}
                          <ArrowUpDown
                            className={`w-3 h-3 ${
                              sort.key === c.key ? "text-blue-600" : "text-muted-foreground/40"
                            }`}
                          />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.groups.map((g) => (
                    <GroupRows key={g.name} group={g} sort={sort} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 못 찾은 이름 + 오타 후보 */}
          {result.notFound.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2">
              <p className="font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> 못 찾은 이름 {result.notFound.length}개
                <span className="font-normal">
                  — 오타이거나, 이미 답사했거나, 아직 수집 안 된 임대인입니다
                </span>
              </p>
              <ul className="mt-1 space-y-0.5 text-amber-900">
                {result.notFound.map((n) => (
                  <li key={n.name}>
                    <strong>{n.name}</strong>
                    {n.similar.length > 0 && (
                      <span className="text-amber-700"> → 혹시 이 사람? {n.similar.join(" · ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 이름 그룹 하나 — 머리줄 "홍길동 (3건)" + 물건 행들 */
function GroupRows({
  group,
  sort,
}: {
  group: BulkSearchGroup;
  sort: { key: SortKey | null; asc: boolean };
}) {
  const rows = sortRows(group.rows, sort.key, sort.asc);
  return (
    <>
      <tr className="bg-blue-50/70 border-t">
        <td colSpan={COLUMNS.length + 1} className="px-2 py-1 font-black text-blue-900">
          {displayOwnerName(group.name)} ({group.rows.length}건)
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={`${group.name}:${r.id}`} className="border-t hover:bg-muted/40">
          <td className="px-2 py-1.5">
            <span
              className={`px-1.5 py-0.5 rounded font-bold ${
                r.field === "owner"
                  ? "bg-slate-200 text-slate-700"
                  : "bg-violet-100 text-violet-800"
              }`}
            >
              {r.field === "owner" ? "소유주" : "임차인"}
            </span>
          </td>
          {COLUMNS.map((c) => (
            <td key={c.key} className={`px-2 py-1.5 ${c.num ? "text-right tabular-nums" : ""}`}>
              {cell(r, c.key)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
