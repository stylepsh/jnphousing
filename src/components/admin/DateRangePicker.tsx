"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  defaultFrom?: string;
  defaultTo?: string;
  className?: string;
}

const PRESETS = [
  { label: "이번달", days: 30 },
  { label: "지난 30일", days: 30, offset: 0 },
  { label: "지난 분기", days: 90 },
  { label: "지난 1년", days: 365 },
];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DateRangePicker({ defaultFrom, defaultTo, className }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const today = new Date();
  const from = searchParams.get("from") ?? defaultFrom ?? ymd(new Date(today.getTime() - 30 * 86400000));
  const to = searchParams.get("to") ?? defaultTo ?? ymd(today);

  function apply(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  function applyPreset(days: number) {
    const f = new Date(today.getTime() - days * 86400000);
    apply(ymd(f), ymd(today));
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)} className="gap-2">
        <Calendar className="h-3.5 w-3.5" />
        <span className="tabular-nums">{from} ~ {to}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[300px] rounded-xl bg-card shadow-xl border border-border z-50 p-4 animate-scale-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">빠른 선택</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.days)}
                  className="text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">직접 입력</p>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                apply(String(fd.get("from")), String(fd.get("to")));
              }}
            >
              <Input name="from" type="date" defaultValue={from} className="h-9 text-sm" />
              <Input name="to" type="date" defaultValue={to} className="h-9 text-sm" />
              <Button type="submit" size="sm" className="w-full">적용</Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
