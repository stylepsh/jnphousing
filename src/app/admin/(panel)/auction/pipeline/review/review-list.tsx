"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewCard, type ReviewItem } from "./review-card";
import { batchReviewInspections } from "../actions";

type BatchAction = "APPROVE" | "REQUEST_RECHECK" | "MARK_OCCUPIED" | "REJECT";

export function ReviewList({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const allSelected = items.length > 0 && items.every((it) => selected.has(it.inspection_id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((it) => it.inspection_id)));
    }
  }

  function handleBatch(action: BatchAction, label: string) {
    if (selected.size === 0) {
      toast.error("선택된 항목이 없습니다.");
      return;
    }
    const selectedItems = items
      .filter((it) => selected.has(it.inspection_id))
      .map((it) => ({ inspectionId: it.inspection_id, propertyId: it.property_id }));

    startTransition(async () => {
      const res = await batchReviewInspections(selectedItems, action);
      if (!res.ok) {
        toast.error(res.error ?? "처리 실패");
        return;
      }
      toast.success(`${label} ${res.count}건 완료`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* 일괄 액션 바 */}
      <div className="sticky top-0 z-20 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-blue-500 hover:bg-blue-50 text-sm font-bold text-blue-700"
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>

          <p className="text-sm font-black text-blue-900 flex-1 min-w-0">
            {selected.size > 0 ? (
              <>선택 <strong>{selected.size}</strong>건</>
            ) : (
              <span className="text-blue-700 font-normal">항목을 선택하면 일괄 처리할 수 있습니다</span>
            )}
          </p>

          {selected.size > 0 && (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => handleBatch("APPROVE", "승인")}
              >
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => handleBatch("REQUEST_RECHECK", "재확인")}
              >
                재확인
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => handleBatch("MARK_OCCUPIED", "점유")}
              >
                점유
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                className="text-red-600"
                onClick={() => handleBatch("REJECT", "제외")}
              >
                제외
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => (
          <ReviewCard
            key={it.inspection_id}
            it={it}
            selected={selected.has(it.inspection_id)}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}
