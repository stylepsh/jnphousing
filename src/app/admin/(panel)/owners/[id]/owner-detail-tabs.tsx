"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, DoorOpen, Phone, Mail, Wallet, ChevronRight } from "lucide-react";
import { OwnerDialog, type SafeOwner } from "../owner-dialog";
import { modeLabel, type OwnerPipeline } from "../constants";

export interface OwnerUnit {
  id: string;
  label: string;
  floor: number | null;
  modes: string[];
  occupied: boolean;
}
export interface OwnerBuilding {
  id: string;
  name: string;
  address: string | null;
  modes: string[];
  units: OwnerUnit[];
}
export interface OwnerDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  account_bank: string | null;
  account_holder: string | null;
  account_masked: string;
  business_name: string | null;
  business_number: string | null;
  representative: string | null;
  memo: string | null;
}

function ModeBadges({ modes }: { modes: string[] }) {
  if (modes.length === 0) return <span className="text-xs text-muted-foreground">관리유형 미지정</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {modes.map((m) => {
        const ml = modeLabel(m);
        return <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ml.color}`}>{ml.label}</span>;
      })}
    </div>
  );
}

export function OwnerDetailTabs({
  detail, buildings, standaloneUnits, pipe,
}: {
  detail: OwnerDetail;
  buildings: OwnerBuilding[];
  standaloneUnits: OwnerUnit[];
  pipe: OwnerPipeline | null;
}) {
  const safe: SafeOwner = {
    id: detail.id, name: detail.name, phone: detail.phone, email: detail.email,
    account_bank: detail.account_bank, account_holder: detail.account_holder,
    business_name: detail.business_name, business_number: detail.business_number,
    representative: detail.representative, memo: detail.memo,
  };
  // 전체 관리유형 롤업
  const allModes = Array.from(new Set([
    ...buildings.flatMap((b) => b.modes),
    ...buildings.flatMap((b) => b.units.flatMap((u) => u.modes)),
    ...standaloneUnits.flatMap((u) => u.modes),
  ]));

  return (
    <div className="space-y-4">
      {/* 헤더 + 파이프라인 요약 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{detail.name}</h1>
          <div className="mt-1.5"><ModeBadges modes={allModes} /></div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Summary label="건물" value={pipe?.building_count ?? buildings.length} icon={Building2} />
          <Summary label="호실" value={pipe?.unit_count ?? 0} icon={DoorOpen} />
          <Summary label="공실" value={pipe?.vacant_count ?? 0} tone={(pipe?.vacant_count ?? 0) > 0 ? "amber" : undefined} />
          <Summary label="임차중" value={pipe?.occupied_count ?? 0} />
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="modes">계약유형</TabsTrigger>
          <TabsTrigger value="props">물건</TabsTrigger>
          <TabsTrigger value="settle">정산</TabsTrigger>
        </TabsList>

        {/* 기본정보 */}
        <TabsContent value="info">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex justify-end"><OwnerDialog mode="edit" owner={safe} /></div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Field icon={Phone} label="연락처" value={detail.phone} />
                <Field icon={Mail} label="이메일" value={detail.email} />
                <Field icon={Wallet} label="계좌" value={[detail.account_bank, detail.account_holder, detail.account_masked].filter(Boolean).join(" · ")} />
                <Field label="사업자명" value={detail.business_name} />
                <Field label="사업자번호" value={detail.business_number} />
                <Field label="대표자" value={detail.representative} />
              </dl>
              {detail.memo && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">메모</p>
                  <p className="text-sm whitespace-pre-wrap">{detail.memo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 계약유형 */}
        <TabsContent value="modes">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                관리유형은 각 건물·호실 등록 시 선택하며, 여기서는 이 소유주의 전체 유형을 합산해 보여줍니다.
              </p>
              <ModeBadges modes={allModes} />
              <p className="text-xs text-muted-foreground pt-2 border-t">
                물건별 개별 유형 편집은 다음 단계(③-b 건물·호실 등록)에서 제공됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 물건 — 건물→호실 드릴다운 */}
        <TabsContent value="props">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">건물 {buildings.length} · 호실 {buildings.reduce((s, b) => s + b.units.length, 0) + standaloneUnits.length}</p>
                <span className="text-xs text-muted-foreground">+ 건물·호실 등록은 ③-b 예정</span>
              </div>

              {buildings.length === 0 && standaloneUnits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">등록된 물건이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {buildings.map((b) => (
                    <div key={b.id} className="rounded-lg border overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{b.name}</span>
                        {b.address && <span className="text-xs text-muted-foreground truncate">{b.address}</span>}
                        <div className="ml-auto"><ModeBadges modes={b.modes} /></div>
                      </div>
                      {b.units.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-3">등록된 호실 없음</p>
                      ) : (
                        <ul className="divide-y">
                          {b.units.map((u) => <UnitRow key={u.id} u={u} />)}
                        </ul>
                      )}
                    </div>
                  ))}
                  {standaloneUnits.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="px-3 py-2 bg-muted/40 text-sm font-semibold flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" /> 단독 호실 (상위 건물 없음)
                      </div>
                      <ul className="divide-y">
                        {standaloneUnits.map((u) => <UnitRow key={u.id} u={u} />)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정산 */}
        <TabsContent value="settle">
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground text-center py-10">
                수수료·정산 내역은 ③-c 단계에서 연결됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ label, value, icon: Icon, tone }: { label: string; value: number; icon?: React.ComponentType<{ className?: string }>; tone?: "amber" }) {
  return (
    <div className="text-center">
      <div className="flex items-center gap-1 justify-center text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${tone === "amber" ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string | null }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">{Icon && <Icon className="h-3 w-3" />}{label}</dt>
      <dd className="mt-0.5">{value || <span className="text-muted-foreground">-</span>}</dd>
    </div>
  );
}

function UnitRow({ u }: { u: OwnerUnit }) {
  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      <DoorOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="font-medium">{u.label}</span>
      {u.floor != null && <span className="text-xs text-muted-foreground">{u.floor}층</span>}
      <div className="ml-2"><ModeBadges modes={u.modes} /></div>
      <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${u.occupied ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
        {u.occupied ? "임차중" : "공실"}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </li>
  );
}
