"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Users2, ListPlus, AlertTriangle, Copy, FileSpreadsheet, ArrowUpDown } from "lucide-react";
import { parseSearchNames, parseSearchAddresses } from "@/lib/auction/bulk-name-match";
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
  | "creditor_type"
  | "appraisal_value"
  | "minimum_bid"
  | "auction_date"
  | "deposit"
  | "monthly_rent"
  | "case_number"
  | "survey_status";

const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "owner_name", label: "소유주" },
  { key: "tenant_name", label: "임차인" },
  { key: "address", label: "주소" },
  { key: "category", label: "분류" },
  { key: "creditor_type", label: "채권자" },
  { key: "appraisal_value", label: "감정가", num: true },
  { key: "minimum_bid", label: "최저가", num: true },
  { key: "auction_date", label: "매각기일" },
  { key: "deposit", label: "보증금", num: true },
  { key: "monthly_rent", label: "월세", num: true },
  { key: "case_number", label: "사건번호" },
  { key: "survey_status", label: "답사상태" },
];

const SURVEY_LABEL: Record<string, string> = {
  pending: "미답사",
  vacant: "공실",
  occupied: "거주중",
  revisit: "재방문",
  skip: "제외",
  rejected: "거부",
  blocked: "차단",
};

const FIELD_LABEL: Record<string, string> = { owner: "소유주", tenant: "임차인", address: "주소" };
const FIELD_STYLE: Record<string, string> = {
  owner: "bg-slate-200 text-slate-700",
  tenant: "bg-violet-100 text-violet-800",
  address: "bg-sky-100 text-sky-800",
};

const NUM_KEYS = new Set<SortKey>(["deposit", "monthly_rent", "appraisal_value", "minimum_bid"]);

function cell(r: BulkSearchRow, key: SortKey): string {
  const v = r[key];
  if (v === null || v === "") return "—";
  if (NUM_KEYS.has(key)) return formatWonMan(Number(v));
  if (key === "survey_status") return SURVEY_LABEL[String(v)] ?? String(v);
  return String(v);
}

function sortRows(rows: BulkSearchRow[], key: SortKey | null, asc: boolean): BulkSearchRow[] {
  if (!key) return rows;
  const num = NUM_KEYS.has(key);
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
  const [mode, setMode] = useState<"name" | "address">("name");
  const [partial, setPartial] = useState(false);
  const [includeSurveyed, setIncludeSurveyed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<{ key: SortKey | null; asc: boolean }>({ key: null, asc: true });
  const [result, setResult] = useState<{
    groups: BulkSearchGroup[];
    notFound: { name: string; similar: string[] }[];
  } | null>(null);

  const names = useMemo(
    () => (mode === "address" ? parseSearchAddresses(text) : parseSearchNames(text)),
    [text, mode],
  );

  const summary = useMemo(() => {
    const rows = (result?.groups ?? []).flatMap((g) => g.rows);
    // 한 물건이 소유주·임차인 양쪽 이름으로 두 번 걸릴 수 있어 합계는 물건 기준으로 센다.
    const all = Array.from(new Map(rows.map((r) => [r.id, r])).values());
    return {
      total: all.length,
      appraisal: all.reduce((s, r) => s + (r.appraisal_value ?? 0), 0),
      minimum: all.reduce((s, r) => s + (r.minimum_bid ?? 0), 0),
      // 답사지 발급 대상은 미답사뿐 — 이미 답사한 건 바구니에 담지 않는다.
      items: all
        .filter((r) => r.survey_status === "pending")
        .map((r) => ({
          id: r.id,
          owner_name: r.owner_name,
          address: r.address,
          case_number: r.case_number,
        })),
    };
  }, [result]);

  function run() {
    if (names.length === 0) {
      toast.error(`검색할 ${mode === "address" ? "주소" : "이름"}가 없습니다. 명단을 붙여넣어 주세요.`);
      return;
    }
    startTransition(async () => {
      const res = await bulkNameSearch(names, { partial, mode, includeSurveyed });
      if (!res.ok || !res.groups) {
        toast.error(res.error ?? "검색 실패");
        return;
      }
      setResult({ groups: res.groups, notFound: res.notFound ?? [] });
      const found = res.groups.reduce((s, g) => s + g.rows.length, 0);
      if (found === 0)
        toast.error(
          includeSurveyed
            ? "수집 이력에 없습니다 (한 번도 습득한 적 없는 물건)"
            : "미답사 물건이 없습니다 — 이미 답사했을 수 있습니다(‘이미 답사한 것도’ 체크)",
        );
      else
        toast.success(
          `${res.groups.length}${mode === "address" ? "곳" : "명"} · ${found}건 찾았습니다`,
        );
    });
  }

  function addAll() {
    if (summary.items.length === 0) return;
    setCart((prev) => mergeCart(prev, summary.items));
    toast.success(`${summary.items.length}건을 취합 바구니에 담았습니다`);
  }

  function copyTsv() {
    const head = [mode === "address" ? "검색주소" : "검색이름", "매칭칸", ...COLUMNS.map((c) => c.label)].join("\t");
    const body = (result?.groups ?? []).flatMap((g) =>
      g.rows.map((r) =>
        [
          g.name,
          FIELD_LABEL[r.field],
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
      body: JSON.stringify({ names, partial, mode, includeSurveyed }),
    });
    if (!res.ok) {
      toast.error("엑셀 생성 실패");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode === "address" ? "주소" : "이름"}일괄검색_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <Users2 className="w-4 h-4 text-blue-600" /> 일괄 검색
        </p>
        <div className="inline-flex rounded-lg border overflow-hidden text-xs font-bold">
          {(
            [
              { v: "name", l: "이름으로" },
              { v: "address", l: "주소로" },
            ] as const
          ).map((m) => (
            <button
              key={m.v}
              onClick={() => {
                setMode(m.v);
                setResult(null);
              }}
              className={`px-2.5 py-1.5 ${
                mode === m.v ? "bg-blue-600 text-white" : "bg-background hover:bg-muted"
              }`}
            >
              {m.l}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {mode === "name" ? (
          <>
            이름을 <strong>줄바꿈이나 쉼표로 여러 개</strong> 붙여넣으면 미답사 물건을 한 번에
            찾습니다. 소유주·임차인 칸을 모두 보고, 공백과 ㈜·(주) 표기는 무시합니다.
            번호(1.)·&quot;외 2명&quot; 꼬리표는 떼고, <strong>괄호 안 이름도 따로 찾습니다</strong>.
          </>
        ) : (
          <>
            주소를 <strong>한 줄에 하나씩</strong> 붙여넣으면 해당 물건을 찾습니다.
            시/도·&quot;제&quot; 표기와 띄어쓰기 차이는 무시합니다(&quot;부평동 222-2 스위트홈
            204호&quot; = &quot;인천광역시 부평구 부평동 222-2 스위트홈 제204호&quot;).{" "}
            <strong>건물까지만 치면 그 건물 물건이 전부</strong> 나옵니다.
          </>
        )}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={
          mode === "name"
            ? "김철수\n박영희, 이민수\n최효준(이승연)\n1. ㈜파크앤시티"
            : "인천광역시 부평구 부평동 222-2 스위트홈 204호\n인천광역시 부평구 부평동 222-2 스위트홈 802호\n인천광역시 부평구 부평동 12-13 한강캐슬 201호"
        }
        className="mt-2 w-full rounded-lg border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button
          onClick={run}
          disabled={pending || names.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-black disabled:opacity-40 min-h-11"
        >
          <ListPlus className="w-4 h-4" />
          {pending ? "찾는 중…" : `${mode === "address" ? "주소" : "이름"} ${names.length}개 검색`}
        </button>
        {mode === "name" && (
          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
              className="w-4 h-4"
            />
            부분 일치 포함
          </label>
        )}
        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeSurveyed}
            onChange={(e) => setIncludeSurveyed(e.target.checked)}
            className="w-4 h-4"
          />
          이미 답사한 것도 (습득 이력 전체)
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
            인식된 {mode === "address" ? "주소" : "이름"} {names.length}개:{" "}
            {names.slice(0, 5).join(" · ")}
            {names.length > 5 ? ` 외 ${names.length - 5}개` : ""}
          </span>
        )}
      </div>

      {result && (
        <div className="mt-3 space-y-3 text-xs">
          {/* 요약 + 결과 활용 */}
          <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-muted/40 p-2">
            <span className="font-black text-emerald-800">
              {mode === "address" ? "주소" : "임대인"} {result.groups.length}
              {mode === "address" ? "곳" : "명"} · {summary.total.toLocaleString()}건
            </span>
            <span className="text-muted-foreground">
              감정가 합계 {formatWonMan(summary.appraisal)} · 최저가 합계{" "}
              {formatWonMan(summary.minimum)}
            </span>
            <span className="flex-1" />
            <button
              onClick={addAll}
              disabled={summary.items.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white font-bold disabled:opacity-40"
            >
              <ListPlus className="w-3.5 h-3.5" /> 미답사 {summary.items.length}건 바구니에 담기
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

          {/* 결과 — 좁은 화면은 카드, 넓은 화면은 표 */}
          {result.groups.length > 0 && (
            <div className="md:hidden space-y-2">
              {/* 폰에는 열 제목이 없으니 정렬은 select 로 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-bold">정렬</span>
                <select
                  value={sort.key ?? ""}
                  onChange={(e) =>
                    setSort({ key: (e.target.value || null) as SortKey | null, asc: sort.asc })
                  }
                  className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs font-bold"
                >
                  <option value="">기본(찾은 순서)</option>
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSort((v) => ({ ...v, asc: !v.asc }))}
                  className="px-2 py-1.5 rounded-md border text-xs font-bold"
                >
                  {sort.asc ? "오름차순" : "내림차순"}
                </button>
              </div>
              {result.groups.map((g) => (
                <GroupCards
                  key={g.name}
                  group={g}
                  label={g.rows[0]?.field === "address" ? g.name : displayOwnerName(g.name)}
                  sort={sort}
                />
              ))}
            </div>
          )}

          {result.groups.length > 0 && (
            <div className="hidden md:block overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1080px] text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold w-14 whitespace-nowrap">칸</th>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        onClick={() => toggleSort(c.key)}
                        className={`px-2 py-1.5 font-bold cursor-pointer select-none whitespace-nowrap hover:bg-muted ${
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
                    <GroupRows key={g.name} group={{ ...g, field: g.rows[0]?.field }} sort={sort} />
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
  group: BulkSearchGroup & { field?: string };
  sort: { key: SortKey | null; asc: boolean };
}) {
  const rows = sortRows(group.rows, sort.key, sort.asc);
  return (
    <>
      <tr className="bg-blue-50/70 border-t">
        <td colSpan={COLUMNS.length + 1} className="px-2 py-1 font-black text-blue-900">
          {group.field === "address" ? group.name : displayOwnerName(group.name)} (
          {group.rows.length}건)
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={`${group.name}:${r.id}`} className="border-t hover:bg-muted/40">
          <td className="px-2 py-1.5">
            <span className={`px-1.5 py-0.5 rounded font-bold ${FIELD_STYLE[r.field]}`}>
              {FIELD_LABEL[r.field]}
            </span>
          </td>
          {COLUMNS.map((c) => (
            <td
              key={c.key}
              className={`px-2 py-1.5 ${
                c.key === "address"
                  ? "min-w-[260px] leading-snug"
                  : "whitespace-nowrap"
              } ${c.num ? "text-right tabular-nums" : ""}`}
            >
              {cell(r, c.key)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** 카드에 접어 보여줄 값 — 비어 있으면 아예 그리지 않는다(폰에서 빈 칸이 제일 방해된다). */
const CARD_FIELDS: SortKey[] = [
  "category",
  "creditor_type",
  "appraisal_value",
  "minimum_bid",
  "auction_date",
  "deposit",
  "monthly_rent",
  "case_number",
];

/** 모바일 카드 — 표 대신. 소유주/임차인·주소를 크게, 나머지는 라벨-값으로 접는다. */
function GroupCards({
  group,
  label,
  sort,
}: {
  group: BulkSearchGroup;
  label: string;
  sort: { key: SortKey | null; asc: boolean };
}) {
  const rows = sortRows(group.rows, sort.key, sort.asc);
  return (
    <div className="rounded-lg border overflow-hidden">
      <p className="px-2.5 py-1.5 bg-blue-50 font-black text-blue-900 text-xs">
        {label} ({group.rows.length}건)
      </p>
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id} className="p-2.5 space-y-1.5">
            <div className="flex items-start gap-1.5 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${FIELD_STYLE[r.field]}`}>
                {FIELD_LABEL[r.field]}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-muted text-muted-foreground">
                {SURVEY_LABEL[r.survey_status] ?? r.survey_status}
              </span>
              <span className="font-black text-sm">{r.owner_name || "소유주 미상"}</span>
              {r.tenant_name && (
                <span className="text-xs text-violet-800">임차인 {r.tenant_name}</span>
              )}
            </div>
            <p className="text-xs leading-snug">{r.address || "—"}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              {CARD_FIELDS.map((k) => {
                const v = cell(r, k);
                if (v === "—") return null;
                return (
                  <div key={k} className="flex justify-between gap-1">
                    <dt className="text-muted-foreground">
                      {COLUMNS.find((c) => c.key === k)?.label}
                    </dt>
                    <dd className="font-bold tabular-nums">{v}</dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
