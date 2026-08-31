"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Plus, RotateCcw } from "lucide-react";
import { blockOwner, unblockOwner, type BlockedOwner } from "./actions";
import { displayOwnerName } from "@/lib/auction/court-auction";

/**
 * 차단 임대인 패널 — "이 사람 물건은 아예 안 본다".
 * 등록하면 지금 풀에서 빠지고, 이후 임포트에서도 자동 제외된다.
 */
export function BlockedOwners({
  owners,
  defaultOpen = false,
}: {
  owners: BlockedOwner[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  function add() {
    const n = name.trim();
    if (!n) {
      toast.error("임대인명을 입력하세요");
      return;
    }
    startTransition(async () => {
      const res = await blockOwner(n, reason.trim() || undefined);
      if (!res.ok) {
        toast.error(res.error ?? "차단 실패");
        return;
      }
      toast.success(`[${n}] 차단 — ${res.removed ?? 0}건 보관함으로 이동`);
      setName("");
      setReason("");
      router.refresh();
    });
  }

  function remove(o: BlockedOwner) {
    if (!confirm(`[${o.owner_name}] 차단을 해제할까요? 다음 임포트부터 다시 수집됩니다.`)) return;
    startTransition(async () => {
      const res = await unblockOwner(o.owner_key);
      if (!res.ok) {
        toast.error(res.error ?? "해제 실패");
        return;
      }
      toast.success(`[${o.owner_name}] 차단 해제 — 보관 ${res.restored ?? 0}건 답사 후보로 복귀`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-bold">
          <Ban className="w-4 h-4 text-slate-600" />
          차단 임대인
          <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
            {owners.length}명
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {open ? "접기" : "펼치기 — 등록·해제"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            차단하면 지금 후보 풀에서 빠지고, 앞으로 지지옥션 텍스트를 붙여넣어도 이 임대인 물건은
            자동 제외됩니다. (표기가 &quot;(주)대성하우징 / 대성하우징(주)&quot; 처럼 흔들려도 같은 사람으로 인식)
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="임대인명 (예: 김민영)"
              className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="사유 (선택 — 예: 연락 두절)"
              className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              onClick={add}
              disabled={pending}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> 차단 추가
            </button>
          </div>

          {owners.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              차단된 임대인이 없습니다. 임대인 카드의 &quot;차단&quot; 버튼으로도 등록됩니다.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {owners.map((o) => (
                <li key={o.owner_key} className="flex items-center gap-2 px-3 py-2">
                  <span className="font-bold text-sm">{displayOwnerName(o.owner_name)}</span>
                  {o.reason && (
                    <span className="text-xs text-muted-foreground truncate">— {o.reason}</span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                    {o.created_at?.slice(0, 10)}
                  </span>
                  <button
                    onClick={() => remove(o)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" /> 해제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
