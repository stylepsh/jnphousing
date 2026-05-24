"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PropertyKind = "house_jeonse" | "house_monthly" | "officetel" | "commercial";

interface Tier {
  upTo: number; // 환산보증금 상한 (원, Infinity 가능)
  rate: number; // 요율 (%)
  cap?: number; // 한도액 (원)
}

const TIERS: Record<PropertyKind, Tier[]> = {
  house_jeonse: [
    { upTo: 50_000_000,    rate: 0.5, cap: 200_000 },
    { upTo: 100_000_000,   rate: 0.4, cap: 300_000 },
    { upTo: 600_000_000,   rate: 0.3 },
    { upTo: 1_200_000_000, rate: 0.4 },
    { upTo: 1_500_000_000, rate: 0.5 },
    { upTo: Infinity,      rate: 0.6 },
  ],
  house_monthly: [
    { upTo: 50_000_000,    rate: 0.5, cap: 200_000 },
    { upTo: 100_000_000,   rate: 0.4, cap: 300_000 },
    { upTo: 600_000_000,   rate: 0.3 },
    { upTo: 1_200_000_000, rate: 0.4 },
    { upTo: 1_500_000_000, rate: 0.5 },
    { upTo: Infinity,      rate: 0.6 },
  ],
  officetel: [
    { upTo: Infinity, rate: 0.5 }, // 주거용 0.5%, 업무용 0.9% (간소화)
  ],
  commercial: [
    { upTo: Infinity, rate: 0.9 }, // 상가·토지 등 한도 0.9% 협의
  ],
};

const LABELS: Record<PropertyKind, string> = {
  house_jeonse:  "주택 (전세)",
  house_monthly: "주택 (월세/반전세)",
  officetel:     "오피스텔 (주거용)",
  commercial:    "상가/사무실",
};

function parseManwon(raw: string): number {
  const n = Number(raw.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n * 10_000 : 0;
}

function fmt(v: number): string {
  if (v === 0) return "0원";
  return `${v.toLocaleString()}원`;
}

function fmtMan(v: number): string {
  if (v === 0) return "-";
  if (v < 10_000) return `${v.toLocaleString()}원`;
  const man = Math.floor(v / 10_000);
  const rest = v % 10_000;
  return rest ? `${man.toLocaleString()}만 ${rest.toLocaleString()}원` : `${man.toLocaleString()}만원`;
}

function calcCommission(kind: PropertyKind, deposit: number, monthlyRent: number) {
  // 환산보증금
  const base = deposit + monthlyRent * 100;
  const adjusted = base < 100_000_000 ? deposit + monthlyRent * 70 : base;

  const tiers = TIERS[kind];
  const tier = tiers.find(t => adjusted <= t.upTo) ?? tiers[tiers.length - 1];

  const calc = Math.floor(adjusted * (tier.rate / 100));
  const fee = tier.cap ? Math.min(calc, tier.cap) : calc;

  return {
    convertedBase: adjusted,
    rate: tier.rate,
    cap: tier.cap,
    fee,
  };
}

export function CommissionCalculator() {
  const [kind, setKind] = useState<PropertyKind>("house_monthly");
  const [depositStr, setDepositStr] = useState("");
  const [rentStr, setRentStr] = useState("");

  const deposit = parseManwon(depositStr);
  const monthlyRent = parseManwon(rentStr);

  const result = useMemo(() => calcCommission(kind, deposit, monthlyRent), [kind, deposit, monthlyRent]);
  const ready = deposit > 0 || monthlyRent > 0;

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div>
          <Label className="text-sm">거래 유형</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as PropertyKind)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LABELS) as PropertyKind[]).map(k => (
                <SelectItem key={k} value={k}>{LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="deposit" className="text-sm">보증금 <span className="text-muted-foreground text-xs">(만원)</span></Label>
            <Input
              id="deposit"
              type="text"
              inputMode="numeric"
              placeholder="예: 5000"
              value={depositStr}
              onChange={(e) => setDepositStr(e.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">{deposit > 0 ? fmt(deposit) : ""}</p>
          </div>
          <div>
            <Label htmlFor="rent" className="text-sm">월세 <span className="text-muted-foreground text-xs">(만원, 전세는 0)</span></Label>
            <Input
              id="rent"
              type="text"
              inputMode="numeric"
              placeholder="예: 50"
              value={rentStr}
              onChange={(e) => setRentStr(e.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">{monthlyRent > 0 ? fmt(monthlyRent) : ""}</p>
          </div>
        </div>

        {ready && (
          <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">예상 중개수수료 (임차인 측)</span>
              <Badge variant="outline" className="text-[10px]">법정 한도 기준</Badge>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {fmtMan(result.fee)}
            </div>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">환산보증금</p>
                <p className="font-semibold">{fmtMan(result.convertedBase)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">적용 요율</p>
                <p className="font-semibold">{result.rate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">한도액</p>
                <p className="font-semibold">{result.cap ? fmtMan(result.cap) : "없음"}</p>
              </div>
            </div>
          </div>
        )}

        {!ready && (
          <div className="rounded-xl bg-slate-50 border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            보증금 또는 월세를 입력하면 예상 수수료가 표시됩니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
