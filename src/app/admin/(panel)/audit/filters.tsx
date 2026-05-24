"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditFiltersProps {
  actions: string[];
}

export function AuditFilters({ actions }: AuditFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const action = params.get("action") ?? "all";
  const q = params.get("q") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function set(name: string, value: string | null) {
    const p = new URLSearchParams(params.toString());
    if (!value || value === "all") p.delete(name);
    else p.set(name, value);
    router.push(`?${p.toString()}`);
  }

  const hasFilter = action !== "all" || q || from || to;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const p = new URLSearchParams(params.toString());
        const newQ = String(fd.get("q") ?? "");
        if (newQ) p.set("q", newQ); else p.delete("q");
        const newFrom = String(fd.get("from") ?? "");
        if (newFrom) p.set("from", newFrom); else p.delete("from");
        const newTo = String(fd.get("to") ?? "");
        if (newTo) p.set("to", newTo); else p.delete("to");
        router.push(`?${p.toString()}`);
      }}
      className="mb-4 flex flex-wrap items-center gap-2"
    >
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input name="q" placeholder="actor·resource·IP 검색…" defaultValue={q} className="pl-8 h-9" />
      </div>
      <Select value={action} onValueChange={(v) => set("action", v)}>
        <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="액션" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 액션</SelectItem>
          {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input name="from" type="date" defaultValue={from} className="w-[140px] h-9" />
      <Input name="to" type="date" defaultValue={to} className="w-[140px] h-9" />
      <Button type="submit" size="sm">검색</Button>
      {hasFilter && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("?")}>
          <X className="h-3 w-3 mr-1" /> 초기화
        </Button>
      )}
    </form>
  );
}
