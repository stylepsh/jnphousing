"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Receipt, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatWon } from "@/lib/money";
import type { OwnerExpense } from "./types";
import { createUnitExpense, deleteUnitExpense, toggleExpenseBilled } from "./expense-actions";
import { EXPENSE_CATEGORIES, computeExpenseSplit } from "./expense-shared";

const CAT_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, c.label]));

const SPLIT_LABEL: Record<string, string> = {
  shared: "비율 분배",
  owner_all: "임대인 전액",
  company_all: "회사 전액",
};

export function ExpenseManager({
  ownerId, units, expenses,
}: {
  ownerId: string;
  units: { id: string; label: string }[];
  expenses: OwnerExpense[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // 폼 상태 (분배 미리보기용)
  const [amount, setAmount] = useState(0);
  const [splitType, setSplitType] = useState<"shared" | "owner_all" | "company_all">("shared");
  const [ownerRatio, setOwnerRatio] = useState(50);

  const preview = useMemo(() => computeExpenseSplit(amount || 0, splitType, ownerRatio), [amount, splitType, ownerRatio]);

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createUnitExpense(ownerId, fd);
      if (r.ok) {
        toast.success("지출이 등록되었습니다.");
        setOpen(false);
        setAmount(0); setSplitType("shared"); setOwnerRatio(50);
        router.refresh();
      } else toast.error("실패", { description: r.error });
    });
  }

  function onDelete(id: string) {
    if (!confirm("이 지출 내역을 삭제할까요?")) return;
    startTransition(async () => {
      const r = await deleteUnitExpense(ownerId, id);
      if (r.ok) { toast.success("삭제되었습니다."); router.refresh(); }
      else toast.error("실패", { description: r.error });
    });
  }

  function onToggleBilled(id: string, billed: boolean) {
    startTransition(async () => {
      const r = await toggleExpenseBilled(ownerId, id, billed);
      if (r.ok) { toast.success(billed ? "임대인 청구 처리" : "청구 해제"); router.refresh(); }
      else toast.error("실패", { description: r.error });
    });
  }

  const totalOwner = expenses.reduce((s, e) => s + e.owner_amount, 0);
  const totalCompany = expenses.reduce((s, e) => s + e.company_amount, 0);
  const unbilledOwner = expenses.filter((e) => !e.billed_to_owner && e.owner_amount > 0).reduce((s, e) => s + e.owner_amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm">
          <span className="text-muted-foreground">임대인 부담 누계 </span>
          <strong className="text-rose-600">{formatWon(totalOwner)}원</strong>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-muted-foreground">회사 부담 </span>
          <strong>{formatWon(totalCompany)}원</strong>
          {unbilledOwner > 0 && (
            <span className="ml-2 text-xs text-amber-600">미청구 {formatWon(unbilledOwner)}원</span>
          )}
        </div>
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)} disabled={units.length === 0}>
          <Plus className="h-4 w-4" /> 지출 등록
        </Button>
      </div>

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">호실을 먼저 등록하면 지출을 입력할 수 있습니다.</p>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">등록된 지출이 없습니다. 도배·수도·배관 등 수리 지출을 입력하세요.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">일자 / 호실</th>
                <th className="text-left px-3 py-2">항목</th>
                <th className="text-right px-3 py-2">지출액</th>
                <th className="text-right px-3 py-2">임대인/회사</th>
                <th className="text-center px-3 py-2">청구</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{e.unit_label}</div>
                    <div className="text-xs text-muted-foreground">{e.incurred_on}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold mr-1">{CAT_LABEL[e.category] ?? e.category}</span>
                    {e.description && <span className="text-xs">{e.description}</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatWon(e.amount)}</td>
                  <td className="px-3 py-2 text-right text-xs tabular-nums">
                    <span className="text-rose-600">{formatWon(e.owner_amount)}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span>{formatWon(e.company_amount)}</span>
                    <div className="text-[10px] text-muted-foreground">{SPLIT_LABEL[e.split_type]}{e.split_type === "shared" ? ` ${e.owner_ratio}:${e.company_ratio}` : ""}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => onToggleBilled(e.id, !e.billed_to_owner)}
                      disabled={pending}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${e.billed_to_owner ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      title="임대인 청구 처리 토글"
                    >
                      {e.billed_to_owner ? <><Check className="h-3 w-3" /> 청구함</> : "미청구"}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive" onClick={() => onDelete(e.id)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 지출 등록 다이얼로그 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>호실 지출 등록</DialogTitle>
            <DialogDescription>수리·공사 지출과 임대인·회사 수익분배를 함께 기록합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">호실 *</Label>
                <select name="unit_id" required className="w-full h-11 px-3 rounded-lg border border-input bg-background text-base">
                  {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block">항목 *</Label>
                <select name="category" defaultValue="repair" className="w-full h-11 px-3 rounded-lg border border-input bg-background text-base">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">내용</Label>
              <Input name="description" placeholder="예: 도배장판 전체 교체, 배관 누수 보수" className="h-11 text-base" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">지출액 (원) *</Label>
                <Input name="amount" type="number" min={0} required value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="800000" className="h-11 text-base" />
              </div>
              <div>
                <Label className="mb-1.5 block">발생일 *</Label>
                <Input name="incurred_on" type="date" required defaultValue={todayIso} className="h-11 text-base" />
              </div>
            </div>

            <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">분배 방식 *</Label>
                  <select name="split_type" value={splitType} onChange={(e) => setSplitType(e.target.value as typeof splitType)} className="w-full h-11 px-3 rounded-lg border border-input bg-background text-base">
                    <option value="shared">비율 분배 (임대인 : 회사)</option>
                    <option value="owner_all">임대인 전액 부담</option>
                    <option value="company_all">회사 전액 부담</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block">임대인 부담 비율 (%)</Label>
                  <Input name="owner_ratio" type="number" min={0} max={100} value={ownerRatio} onChange={(e) => setOwnerRatio(Number(e.target.value))} disabled={splitType !== "shared"} className="h-11 text-base" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm rounded-md bg-background border px-3 py-2">
                <span className="text-muted-foreground">분배 미리보기</span>
                <span>
                  임대인 <strong className="text-rose-600">{formatWon(preview.owner_amount)}원</strong>
                  <span className="mx-2 text-muted-foreground">·</span>
                  회사 <strong>{formatWon(preview.company_amount)}원</strong>
                </span>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">메모</Label>
              <Input name="memo" placeholder="업체명·청구 참고 등" className="h-11 text-base" />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending} className="gap-1">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}<Receipt className="h-4 w-4" /> 지출 등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
