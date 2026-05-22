"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, RotateCcw } from "lucide-react";

interface Props {
  properties: { id: string; name: string }[];
  initial: {
    property?: string;
    minDeposit?: string;
    maxDeposit?: string;
    minRent?: string;
    maxRent?: string;
  };
}

export function VacancyFilters({ properties, initial }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  function reset() {
    router.push("?");
  }

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">필터</span>
          <Button variant="ghost" size="sm" onClick={reset} className="ml-auto h-7">
            <RotateCcw className="h-3 w-3 mr-1" /> 초기화
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">건물</label>
            <Select
              value={initial.property ?? "all"}
              onValueChange={(v) => setParam("property", !v || v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FilterPair
            label="보증금 (만원)"
            minKey="minDeposit"
            maxKey="maxDeposit"
            initial={initial}
            onChange={setParam}
          />
          <FilterPair
            label="월세 (만원)"
            minKey="minRent"
            maxKey="maxRent"
            initial={initial}
            onChange={setParam}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FilterPair({
  label,
  minKey,
  maxKey,
  initial,
  onChange,
}: {
  label: string;
  minKey: string;
  maxKey: string;
  initial: Record<string, string | undefined>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="최소"
          className="h-9"
          defaultValue={initial[minKey] ?? ""}
          onBlur={(e) => onChange(minKey, e.target.value)}
        />
        <span className="text-muted-foreground">~</span>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="최대"
          className="h-9"
          defaultValue={initial[maxKey] ?? ""}
          onBlur={(e) => onChange(maxKey, e.target.value)}
        />
      </div>
    </div>
  );
}
