"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2, Clock, Wrench, XCircle } from "lucide-react";
import { lookupComplaint, type LookupResult } from "./actions";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const CATEGORY_LABEL: Record<string, string> = {
  as: "AS 요청",
  facility: "시설 고장",
  noise: "소음 민원",
  complaint: "기타 민원",
  etc: "기타",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  received: { label: "접수됨", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  in_progress: { label: "처리 중", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Wrench },
  resolved: { label: "처리 완료", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  closed: { label: "종결", color: "bg-slate-100 text-slate-700 border-slate-200", icon: XCircle },
};

export function LookupForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<LookupResult | null>(null);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const r = await lookupComplaint(formData);
      setResult(r);
    });
  }

  return (
    <div className="space-y-6">
      <form action={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="phone" className="text-base font-medium">연락처</label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="010-1234-5678"
            className="h-12 text-base mt-2"
            required
          />
        </div>
        <div>
          <label htmlFor="code" className="text-base font-medium">접수번호</label>
          <Input
            id="code"
            name="code"
            placeholder="민원 접수 시 받은 8자리"
            className="h-12 text-base mt-2 font-mono uppercase tracking-wider"
            maxLength={8}
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full h-12" disabled={pending}>
          {pending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 조회 중...</>
          ) : (
            <><Search className="h-4 w-4 mr-2" /> 조회하기</>
          )}
        </Button>
      </form>

      {result && !result.ok && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-900">
          {result.error}
        </div>
      )}

      {result && result.ok && (() => {
        const c = result.complaint;
        const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.received;
        const StatusIcon = cfg.icon;
        return (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <Badge className={`${cfg.color} hover:${cfg.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {c.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.building_name && `${c.building_name} · `}
                {c.unit_number && `${c.unit_number}호 · `}
                {CATEGORY_LABEL[c.category] ?? c.category}
              </p>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">접수일</span>
                <span>{format(new Date(c.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
              </div>
              {c.visit_scheduled_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">방문 예정일</span>
                  <span className="font-semibold text-blue-700">
                    {format(new Date(c.visit_scheduled_at), "yyyy.MM.dd (EEE)", { locale: ko })}
                  </span>
                </div>
              )}
              {c.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">처리 완료일</span>
                  <span>{format(new Date(c.resolved_at), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                </div>
              )}
              {c.admin_memo && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">관리자 답변</p>
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.admin_memo}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
