"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Trash2,
  Users2,
  PackageCheck,
  Undo2,
} from "lucide-react";
import {
  listSheetItems,
  deleteSheetLog,
  setSheetReturned,
  type SheetLog,
  type SheetItemRow,
} from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "미답사",
  vacant: "공실",
  occupied: "점유",
  revisit: "재방문",
  skip: "제외",
  rejected: "거부",
  blocked: "차단보관",
};

/** 발급 1건 — 펼치면 그때 준 물건 명단, 같은 명단으로 엑셀 재발급. */
export function SheetCard({ sheet }: { sheet: SheetLog }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SheetItemRow[] | null>(null);
  const daysAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(sheet.printed_at).getTime()) / 86_400_000),
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null) {
      startTransition(async () => {
        setItems(await listSheetItems(sheet.id));
      });
    }
  }

  async function redownload() {
    const rows = items ?? (await listSheetItems(sheet.id));
    setItems(rows);
    if (rows.length === 0) {
      toast.error("이 발급의 물건 명단을 찾을 수 없습니다.");
      return;
    }
    try {
      const res = await fetch("/admin/auction/pipeline/survey-xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: rows.map((r) => r.id), team: sheet.team_name ?? "" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "엑셀 생성 실패");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `답사지_${sheet.printed_at.slice(0, 10)}_${sheet.team_name ?? "팀미기재"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("같은 명단으로 엑셀 재발급");
    } catch {
      toast.error("재발급 실패");
    }
  }

  function toggleReturned() {
    startTransition(async () => {
      const res = await setSheetReturned(sheet.id, !sheet.returned_at);
      if (!res.ok) {
        toast.error(res.error ?? "처리 실패");
        return;
      }
      toast.success(sheet.returned_at ? "회수 취소" : "회수 완료로 표시");
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("이 발급 이력을 삭제할까요? 물건 데이터는 그대로입니다.")) return;
    startTransition(async () => {
      const res = await deleteSheetLog(sheet.id);
      if (!res.ok) {
        toast.error(res.error ?? "삭제 실패");
        return;
      }
      toast.success("발급 이력 삭제");
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border bg-card ${
        !sheet.returned_at && daysAgo >= 14 ? "border-rose-300" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={toggle} className="inline-flex items-center gap-2 text-left flex-1 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-black shrink-0">{sheet.printed_at.slice(0, 10)}</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
            <Users2 className="w-3 h-3" />
            {sheet.team_name || "팀 미기재"}
          </span>
          <span className="text-sm truncate">{sheet.region_label}</span>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            {sheet.total_count}건
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {sheet.kind === "xlsx" ? "엑셀" : "인쇄"}
          </span>
          {sheet.returned_at ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
              회수 {sheet.returned_at.slice(5, 10).replace("-", "/")}
            </span>
          ) : (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                daysAgo >= 14 ? "text-rose-700 bg-rose-100" : "text-amber-800 bg-amber-100"
              }`}
              title={daysAgo >= 14 ? "2주 넘게 미회수 — 확인이 필요합니다" : "아직 회수 안 됨"}
            >
              미회수 {daysAgo}일
            </span>
          )}
        </button>
        <button
          onClick={toggleReturned}
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded shrink-0"
          title={sheet.returned_at ? "회수 표시 취소" : "답사지를 돌려받았음"}
        >
          {sheet.returned_at ? <Undo2 className="w-3.5 h-3.5" /> : <PackageCheck className="w-3.5 h-3.5" />}
          {sheet.returned_at ? "회수취소" : "회수완료"}
        </button>
        <button
          onClick={redownload}
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded shrink-0"
          title="같은 명단으로 엑셀 다시 받기"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> 재발급
        </button>
        <button
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:bg-rose-50 hover:text-rose-600 shrink-0"
          title="이력 삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="border-t">
          {items === null ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">
              명단 기록이 없습니다 (마이그레이션 036 이전 발급).
            </p>
          ) : (
            <ul className="divide-y text-sm max-h-96 overflow-y-auto">
              {items.map((it) => (
                <li key={it.id} className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {it.case_number}
                  </span>
                  <span className="flex-1 min-w-[200px]">{it.address}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{it.owner_name}</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted shrink-0">
                    {STATUS_LABEL[it.survey_status] ?? it.survey_status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
