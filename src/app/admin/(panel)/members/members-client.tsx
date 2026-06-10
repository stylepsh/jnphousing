"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Handshake, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { approveLandlordApplication, approveTenantApplication, rejectApplication } from "./actions";
import { approveAgency, rejectAgency } from "../agencies/actions";

export interface ApplicationRow {
  id: string;
  role: "landlord" | "tenant";
  name: string;
  phone: string;
  email: string | null;
  property_info: string | null;
  memo: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
}

export interface PendingAgencyRow {
  id: string;
  company_name: string;
  representative: string;
  phone: string;
  business_number: string;
  created_at: string;
}

export interface OwnerOption {
  id: string;
  name: string;
  phone: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "대기", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "승인", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "반려", cls: "bg-red-50 text-red-700 border-red-200" },
};

export function MembersClient({
  applications, pendingAgencies, owners,
}: {
  applications: ApplicationRow[];
  pendingAgencies: PendingAgencyRow[];
  owners: OwnerOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [ownerPick, setOwnerPick] = useState<Record<string, string>>({});

  const landlordApps = applications.filter((a) => a.role === "landlord");
  const tenantApps = applications.filter((a) => a.role === "tenant");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(okMsg);
      else toast.error(res.error ?? "처리 실패");
    });
  }

  function reject(id: string, isAgency = false) {
    const reason = window.prompt("반려 사유를 입력하세요:");
    if (!reason || !reason.trim()) return;
    run(
      () => (isAgency ? rejectAgency(id, reason.trim()) : rejectApplication(id, reason.trim())),
      "반려 처리했습니다.",
    );
  }

  return (
    <div className="space-y-8">
      {/* 부동산 가입 신청 (기존 agencies 흐름) */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Handshake className="h-3.5 w-3.5" /> 부동산 신청 대기 <span className="text-primary">{pendingAgencies.length}</span>건
        </p>
        <Card>
          <CardContent className="p-0">
            {pendingAgencies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">대기 중인 부동산 가입 신청이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-border">
                {pendingAgencies.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-semibold">{a.company_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.representative} · {a.phone} · 사업자 {a.business_number}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.created_at.slice(0, 10)}</span>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={pending} onClick={() => run(() => approveAgency(a.id), "부동산 회원을 승인했습니다.")} className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> 승인
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => reject(a.id, true)} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                        <XCircle className="h-3.5 w-3.5" /> 반려
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 임대인 가입 신청 */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> 임대인 신청 <span className="text-primary">{landlordApps.filter((a) => a.status === "pending").length}</span>건 대기
        </p>
        <Card>
          <CardContent className="p-0">
            {landlordApps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">임대인 가입 신청이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-border">
                {landlordApps.map((a) => {
                  const badge = STATUS_BADGE[a.status];
                  return (
                    <li key={a.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-sm font-semibold">
                            {a.name} <span className="font-normal text-muted-foreground">· {a.phone}{a.email ? ` · ${a.email}` : ""}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">보유 물건: {a.property_info ?? "—"}{a.memo ? ` / ${a.memo}` : ""}</p>
                          {a.status === "rejected" && a.reject_reason && (
                            <p className="text-xs text-red-600 mt-0.5">반려 사유: {a.reject_reason}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
                        <span className="text-xs text-muted-foreground">{a.created_at.slice(0, 10)}</span>
                      </div>
                      {a.status === "pending" && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[220px]"
                            value={ownerPick[a.id] ?? ""}
                            onChange={(e) => setOwnerPick((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          >
                            <option value="">연결할 소유주 선택…</option>
                            {owners.map((o) => (
                              <option key={o.id} value={o.id}>{o.name}{o.phone ? ` (${o.phone})` : ""}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={pending || !ownerPick[a.id]}
                            onClick={() => run(() => approveLandlordApplication(a.id, ownerPick[a.id]), "임대인을 승인하고 소유주에 연결했습니다.")}
                            className="gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> 소유주 연결 + 승인
                          </Button>
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => reject(a.id)} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                            <XCircle className="h-3.5 w-3.5" /> 반려
                          </Button>
                        </div>
                      )}
                      {a.status === "pending" && owners.length === 0 && (
                        <p className="text-xs text-amber-700 mt-1.5">먼저 소유주 메뉴에서 이 임대인의 소유주 카드를 등록하세요.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 임차인 가입 신청 */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> 임차인 신청 <span className="text-primary">{tenantApps.filter((a) => a.status === "pending").length}</span>건 대기
        </p>
        <Card>
          <CardContent className="p-0">
            {tenantApps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">임차인 가입 신청이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tenantApps.map((a) => {
                  const badge = STATUS_BADGE[a.status];
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm font-semibold">
                          {a.name} <span className="font-normal text-muted-foreground">· {a.phone}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.property_info ?? "—"}{a.memo ? ` / ${a.memo}` : ""}</p>
                        {a.status === "rejected" && a.reject_reason && (
                          <p className="text-xs text-red-600 mt-0.5">반려 사유: {a.reject_reason}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
                      <span className="text-xs text-muted-foreground">{a.created_at.slice(0, 10)}</span>
                      {a.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" disabled={pending} onClick={() => run(() => approveTenantApplication(a.id), "확인 완료 처리했습니다.")} className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 확인 완료
                          </Button>
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => reject(a.id)} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                            <XCircle className="h-3.5 w-3.5" /> 반려
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">
          ※ 임차인은 별도 계정 없이 임차인존(호실 + 휴대폰 끝 4자리)을 사용합니다. 신청 확인 후 계약·임차인 등록을 진행하세요.
        </p>
      </section>
    </div>
  );
}
