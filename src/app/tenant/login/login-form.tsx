"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tenantLogin } from "./actions";

interface UnitOption {
  id: string;
  unit_no: string;
  property: { name: string } | null;
}

export function TenantLoginForm({ units }: { units: UnitOption[] }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("unit_id", unitId);
    startTransition(async () => {
      const r = await tenantLogin(fd);
      if (r.ok) {
        toast.success("인증되었습니다.");
        router.push(r.redirect);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label className="text-base">호실 선택 *</Label>
        <Select value={unitId} onValueChange={(v) => v && setUnitId(v)}>
          <SelectTrigger className="mt-1.5 h-12">
            <SelectValue placeholder="호실을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.property?.name ?? "—"} · {u.unit_no}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="phone_last4" className="text-base">휴대폰 끝 4자리 *</Label>
        <Input
          id="phone_last4"
          name="phone_last4"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          required
          placeholder="0000"
          className="mt-1.5 h-12 text-base tracking-widest text-center"
        />
      </div>
      <Button type="submit" size="lg" className="w-full h-12" disabled={pending || !unitId}>
        {pending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 인증 중...</> : "인증하기"}
      </Button>
    </form>
  );
}
