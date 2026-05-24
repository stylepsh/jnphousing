"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface PropertyFilterProps {
  properties: { id: string; name: string }[];
}

export function PropertyFilter({ properties }: PropertyFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("propertyId") ?? "all";

  function onChange(next: string | null) {
    if (!next) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("propertyId");
    else params.set("propertyId", next);
    router.push(`?${params.toString()}`);
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-9 gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10">
        <Building2 className="h-3.5 w-3.5 text-blue-300" />
        <SelectValue placeholder="건물 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 건물</SelectItem>
        {properties.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
