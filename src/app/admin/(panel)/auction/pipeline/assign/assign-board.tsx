"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignInspection } from "../actions";
import { cn } from "@/lib/utils";

export type AssignItem = {
  id: string;
  case_number: string;
  address: string;
  owner_name: string | null;
  creditor_type: string | null;
  pipeline_state: string;
};

export function AssignBoard({ items }: { items: AssignItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspectorName, setInspectorName] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function downloadSurveyPdf() {
    if (selected.size === 0) {
      toast.error("PDF로 출력할 물건을 선택하세요.");
      return;
    }
    try {
      const res = await fetch("/admin/auction/pipeline/survey-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), inspectorName: inspectorName.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "PDF 생성 실패");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("PDF 다운로드 실패");
    }
  }

  function assign() {
    if (selected.size === 0) {
      toast.error("배정할 물건을 선택하세요.");
      return;
    }
    if (!inspectorName.trim()) {
      toast.error("답사자 이름을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await assignInspection({
        propertyIds: Array.from(selected),
        inspectorName: inspectorName.trim(),
      });
      if (!res.ok) {
        toast.error(res.error ?? "배정 실패");
        return;
      }
      toast.success(`${res.count}건 답사 배정 완료`);
      setSelected(new Set());
      setInspectorName("");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        답사 배정 대기 물건이 없습니다. 수집 풀에서 <strong>답사 선정</strong>한 물건이 여기로 옵니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3.5">
        <div className="space-y-1.5 flex-1 min-w-[180px]">
          <Label>답사자 이름</Label>
          <Input value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} placeholder="예: 김현장" />
        </div>
        <Button onClick={assign} disabled={pending}>
          {pending ? "배정 중..." : `선택 ${selected.size}건 배정`}
        </Button>
        <Button variant="outline" onClick={downloadSurveyPdf} disabled={pending}>
          답사지 PDF
        </Button>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-10">
                <input type="checkbox" checked={selected.size === items.length} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2 font-semibold">사건번호</th>
              <th className="px-3 py-2 font-semibold">주소</th>
              <th className="px-3 py-2 font-semibold">소유자</th>
              <th className="px-3 py-2 font-semibold">채권</th>
              <th className="px-3 py-2 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr
                key={it.id}
                onClick={() => toggle(it.id)}
                className={cn("border-b cursor-pointer hover:bg-muted/40", selected.has(it.id) && "bg-blue-50")}
              >
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} onClick={(e) => e.stopPropagation()} />
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">{it.case_number}</td>
                <td className="px-3 py-2.5 max-w-[280px]"><div className="line-clamp-1">{it.address}</div></td>
                <td className="px-3 py-2.5">{it.owner_name ?? "-"}</td>
                <td className="px-3 py-2.5 text-xs">{it.creditor_type ?? "-"}</td>
                <td className="px-3 py-2.5 text-xs">{it.pipeline_state === "Recheck" ? "재확인" : "선정"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
