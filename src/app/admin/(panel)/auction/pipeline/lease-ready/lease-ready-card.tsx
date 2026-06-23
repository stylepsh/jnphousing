"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handoffToLease } from "../actions";
import { calcSettlement } from "@/lib/auction/pipeline/settlement";
import { formatWon } from "@/lib/auction/case-stages";

export type LeaseReadyItem = {
  id: string;
  case_number: string;
  address: string;
  owner_name: string | null;
  total_work_cost: number | null;
};

export function LeaseReadyCard({ it }: { it: LeaseReadyItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tenantName, setTenantName] = useState("");
  const [rent, setRent] = useState("");
  const [feeRate, setFeeRate] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deposit, setDeposit] = useState("");
  const [rentCollectionMemo, setRentCollectionMemo] = useState("");

  const preview = useMemo(
    () =>
      calcSettlement({
        monthlyRent: Number(rent.replace(/[^\d]/g, "")) || 0,
        managementFeeRate: Number(feeRate) || 0,
        individualTaxRate: Number(taxRate) || 0,
        totalWorkCost: it.total_work_cost ?? 0,
      }),
    [rent, feeRate, taxRate, it.total_work_cost],
  );

  function submit() {
    const r = Number(rent.replace(/[^\d]/g, ""));
    if (!r || r <= 0) {
      toast.error("월세를 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await handoffToLease({
        propertyId: it.id,
        monthlyRent: r,
        managementFeeRate: Number(feeRate) || 0,
        individualTaxRate: Number(taxRate) || 0,
        deposit: Number(deposit.replace(/[^\d]/g, "")) || 0,
        rentCollectionMemo: rentCollectionMemo || undefined,
        tenantName: tenantName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (!res.ok) {
        toast.error(res.error ?? "처리 실패");
        return;
      }
      toast.success("계약 체결 — 임대중으로 이동");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div>
        <div className="font-mono text-xs font-semibold text-blue-700">{it.case_number}</div>
        <div className="text-sm font-medium line-clamp-1">{it.address}</div>
        <div className="text-xs text-muted-foreground">
          {it.owner_name ?? "-"} · 상품화비용 {formatWon(it.total_work_cost ?? 0)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">임차인</Label>
          <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">월세(원)</Label>
          <Input value={rent} onChange={(e) => setRent(e.target.value)} className="h-8 text-sm" placeholder="예: 500000" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">수수료율 %</Label>
          <Input value={feeRate} onChange={(e) => setFeeRate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">세율 %</Label>
          <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">보증금(원)</Label>
          <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} className="h-8 text-sm" placeholder="예: 5000000" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">수금일</Label>
          <Input value={rentCollectionMemo} onChange={(e) => setRentCollectionMemo(e.target.value)} className="h-8 text-sm" placeholder="예: 매월 25일 / 이달 27일" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">시작일</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">종료일</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs space-y-0.5">
        <div className="flex justify-between"><span>월세</span><span>{formatWon(preview.rent)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>− 수수료</span><span>{formatWon(preview.fee)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>− 작업비</span><span>{formatWon(preview.workCost)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>− 세금</span><span>{formatWon(preview.tax)}</span></div>
        <div className="flex justify-between font-bold border-t pt-0.5 mt-0.5"><span>임대인 지급</span><span>{formatWon(preview.payout)}</span></div>
      </div>

      <Button onClick={submit} disabled={pending} className="w-full" size="sm">
        {pending ? "처리 중..." : "계약 체결 → 임대중"}
      </Button>
    </div>
  );
}
