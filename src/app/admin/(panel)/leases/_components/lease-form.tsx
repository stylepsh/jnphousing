"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Copy, ClipboardCheck } from "lucide-react";
import { upsertLease } from "../actions";
import type { Lease } from "@/types/lease";

interface Option { id: string; name: string }
interface UnitOption { id: string; unit_no: string; owner_id: string | null; property_id?: string; properties: { name: string } | null }
interface BuildingOption { id: string; name: string; owner_id: string | null }

interface Props {
  mode: "create" | "edit";
  lease?: Lease;
  adminName?: string;
  /** 재계약/연장: 이전 계약 id (있으면 새 계약에 연결) */
  prevLeaseId?: string;
  /** 재계약/연장 모드 — lease 값을 기본값으로 끌어오고 날짜는 갱신 기간으로 제안 */
  renew?: boolean;
  options: {
    landlords: Option[];
    tenants: Option[];
    units: UnitOption[];
    buildings: BuildingOption[];
  };
}

// 갱신 날짜 제안: 새 시작일 = 이전 종료일 +1일, 새 종료일 = +1년 -1일
function renewalDates(endDate?: string | null): { start: string; end: string } {
  if (!endDate) return { start: "", end: "" };
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const s = new Date(endDate); s.setDate(s.getDate() + 1);
  const e = new Date(s); e.setFullYear(e.getFullYear() + 1); e.setDate(e.getDate() - 1);
  return { start: iso(s), end: iso(e) };
}

function channelFromType(t?: string): string {
  if (t === "direct") return "direct";
  if (t === "referral") return "referral";
  if (t === "broker") return "agency";
  if (t === "other") return "etc";
  return "direct";
}

// 입력칸 통일 — 시원하게 (h-11 / text-base)
const inputCls = "mt-1.5 h-11 text-base";
const selectCls = "mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring";

const CHANNELS: { key: string; label: string; type: "direct" | "broker" | "referral" | "other" }[] = [
  { key: "direct", label: "자체 계약 (직접)", type: "direct" },
  { key: "33m2", label: "삼삼엠투", type: "broker" },
  { key: "peterpan", label: "피터팬의 좋은방", type: "broker" },
  { key: "zigbang", label: "직방", type: "broker" },
  { key: "dabang", label: "다방", type: "broker" },
  { key: "naver", label: "네이버 부동산", type: "broker" },
  { key: "agency", label: "공인중개사", type: "broker" },
  { key: "referral", label: "소개", type: "referral" },
  { key: "etc", label: "기타", type: "other" },
];

const PREP_PRESETS = ["청소", "수리", "도배·장판", "입주청소", "열쇠 교체", "도어록 점검"];

const BEARER_LABEL: Record<string, string> = { jnp: "JNP", owner: "임대인", half: "반반(5:5)" };

function fmt(n: number) { return (n || 0).toLocaleString("ko-KR"); }

export function LeaseForm({ mode, lease, options, adminName, prevLeaseId, renew }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const rd = renew ? renewalDates(lease?.end_date) : null;

  const [leaseType, setLeaseType] = useState<"long_term" | "short_term">(lease?.lease_type ?? "long_term");
  const [landlordId, setLandlordId] = useState(lease?.landlord_id ?? "");
  const [buildingId, setBuildingId] = useState("");
  const [unitId, setUnitId] = useState(lease?.unit_id ?? "");

  const [tenantMode, setTenantMode] = useState<"existing" | "new">("existing");
  const [tenantId, setTenantId] = useState(lease?.tenant_id ?? "");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");

  const [startDate, setStartDate] = useState(rd?.start ?? lease?.start_date ?? "");
  const [moveInDate, setMoveInDate] = useState(renew ? "" : (lease?.move_in_date ?? ""));
  const [endDate, setEndDate] = useState(rd?.end ?? lease?.end_date ?? "");

  const [deposit, setDeposit] = useState(lease?.deposit ?? 0);
  const [rent, setRent] = useState(lease?.rent_amount ?? 0);
  const [mgmtFee, setMgmtFee] = useState(lease?.management_fee ?? 0);
  const [rentCycle, setRentCycle] = useState<"monthly" | "weekly" | "daily">(lease?.rent_cycle ?? "monthly");
  const [rentDay, setRentDay] = useState<number | "">(lease?.rent_day ?? 25);
  const [vatIncluded, setVatIncluded] = useState(lease?.vat_included ?? false);

  const [feeMode, setFeeMode] = useState<"percent" | "fixed">(lease?.fee_type ?? "percent");
  const [jnpPercent, setJnpPercent] = useState<number>(lease?.fee_percent ?? 10);
  const [feeFixed, setFeeFixed] = useState<number>(lease?.fee_fixed ?? 0);
  const [overdueRate, setOverdueRate] = useState<number>(lease?.overdue_annual_rate ?? 12);

  const [brokerageFee, setBrokerageFee] = useState<number>(0);
  const [brokerageBearer, setBrokerageBearer] = useState<"jnp" | "owner" | "half">("jnp");

  const [channel, setChannel] = useState(lease ? channelFromType(lease.contract_source_type) : "direct");
  const [sourceName, setSourceName] = useState(lease?.contract_source_name ?? "");
  const [sourceContact, setSourceContact] = useState(lease?.contract_source_contact ?? "");
  const [sourceMemo, setSourceMemo] = useState(lease?.contract_source_memo ?? "");

  const [prepSel, setPrepSel] = useState<Set<string>>(new Set());
  const [prepCustom, setPrepCustom] = useState("");

  const [recorder, setRecorder] = useState(adminName ?? "");
  const [specialTerms, setSpecialTerms] = useState(lease?.special_terms ?? "");

  // 임대인 → 건물 → 호실 종속
  const buildings = useMemo(() => options.buildings.filter((b) => !landlordId || b.owner_id === landlordId), [landlordId, options.buildings]);
  const units = useMemo(
    () => options.units.filter((u) => (!landlordId || u.owner_id === landlordId) && (!buildingId || u.property_id === buildingId)),
    [landlordId, buildingId, options.units],
  );

  function onLandlord(v: string) {
    setLandlordId(v);
    setBuildingId("");
    if (unitId && !options.units.some((u) => u.id === unitId && u.owner_id === v)) setUnitId("");
  }
  function onBuilding(v: string) {
    setBuildingId(v);
    if (unitId && v && !options.units.some((u) => u.id === unitId && u.property_id === v)) setUnitId("");
  }

  // 표시용 라벨
  const landlordName = options.landlords.find((l) => l.id === landlordId)?.name ?? "";
  const unitObj = options.units.find((u) => u.id === unitId);
  const unitNo = unitObj?.unit_no ?? "";
  const buildingName = unitObj?.properties?.name ?? options.buildings.find((b) => b.id === buildingId)?.name ?? "";
  const existingTenantName = options.tenants.find((t) => t.id === tenantId)?.name ?? "";
  const channelObj = CHANNELS.find((c) => c.key === channel)!;
  const allPrep = useMemo(
    () => [...prepSel, ...prepCustom.split(",").map((s) => s.trim()).filter(Boolean)],
    [prepSel, prepCustom],
  );

  const summary = useMemo(() => {
    const tName = tenantMode === "new" ? tenantName : existingTenantName;
    const lines: string[] = ["[JNP 계약 정보]"];
    lines.push(`• 임대인: ${landlordName || "-"}`);
    lines.push(`• 건물/호실: ${buildingName ? buildingName + " " : ""}${unitNo ? unitNo + "호" : "-"}`);
    lines.push(`• 임차인: ${tName || "-"}${tenantMode === "new" && tenantPhone ? ` (${tenantPhone})` : ""}`);
    lines.push(`• 계약유형: ${leaseType === "long_term" ? "장기임대" : "단기임대"}`);
    if (startDate) lines.push(`• 계약일: ${startDate}`);
    if (moveInDate) lines.push(`• 입주일: ${moveInDate}`);
    if (endDate) lines.push(`• 계약종료: ${endDate}`);
    lines.push(`• 보증금: ${fmt(deposit)}원`);
    lines.push(`• 월세: ${fmt(rent)}원${rentCycle === "monthly" && rentDay ? ` (매월 ${rentDay}일)` : ""}`);
    if (mgmtFee) lines.push(`• 관리비: ${fmt(mgmtFee)}원`);
    if (feeMode === "percent") lines.push(`• 수익분배: 임대인 ${100 - jnpPercent}% / JNP ${jnpPercent}%`);
    else lines.push(`• 위탁수수료(정액): ${fmt(feeFixed)}원`);
    lines.push(`• 계약경로: ${channelObj.label}${sourceName ? ` (${sourceName})` : ""}`);
    if (brokerageFee > 0) lines.push(`• 부동산 중개수수료: ${fmt(brokerageFee)}원 (${BEARER_LABEL[brokerageBearer]} 부담)`);
    if (allPrep.length) lines.push(`• 입주 준비: ${allPrep.join(", ")}`);
    if (recorder) lines.push(`• 입력자: ${recorder}`);
    if (specialTerms) lines.push(`• 특약: ${specialTerms}`);
    return lines.join("\n");
  }, [tenantMode, tenantName, existingTenantName, tenantPhone, landlordName, buildingName, unitNo, leaseType, startDate, moveInDate, endDate, deposit, rent, rentCycle, rentDay, mgmtFee, feeMode, jnpPercent, feeFixed, channelObj, sourceName, brokerageFee, brokerageBearer, allPrep, recorder, specialTerms]);

  function copySummary() {
    navigator.clipboard.writeText(summary).then(
      () => toast.success("카카오톡용 계약정보가 복사되었습니다."),
      () => toast.error("복사 실패 — 길게 눌러 직접 복사해 주세요."),
    );
  }

  function togglePrep(t: string) {
    setPrepSel((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!landlordId) return toast.error("임대인을 선택해 주세요.");
    if (!unitId) return toast.error("호실을 선택해 주세요.");
    if (tenantMode === "existing" && !tenantId) return toast.error("임차인을 선택하거나 신규로 입력해 주세요.");
    if (tenantMode === "new" && (!tenantName.trim() || !tenantPhone.trim())) return toast.error("신규 임차인 이름·연락처를 입력해 주세요.");
    if (!startDate || !endDate) return toast.error("계약일·종료일을 입력해 주세요.");

    const fd = new FormData();
    fd.set("lease_type", leaseType);
    fd.set("landlord_id", landlordId);
    fd.set("unit_id", unitId);
    if (tenantMode === "existing") fd.set("tenant_id", tenantId);
    else { fd.set("tenant_id", ""); fd.set("tenant_name", tenantName.trim()); fd.set("tenant_phone", tenantPhone.trim()); }
    fd.set("start_date", startDate);
    fd.set("move_in_date", moveInDate);
    fd.set("end_date", endDate);
    fd.set("deposit", String(deposit || 0));
    fd.set("rent_amount", String(rent || 0));
    fd.set("management_fee", String(mgmtFee || 0));
    fd.set("rent_cycle", rentCycle);
    fd.set("rent_day", rentCycle === "monthly" ? String(rentDay || "") : "");
    fd.set("vat_included", vatIncluded ? "on" : "");
    fd.set("fee_type", feeMode);
    fd.set("fee_percent", feeMode === "percent" ? String(jnpPercent) : "");
    fd.set("fee_fixed", feeMode === "fixed" ? String(feeFixed) : "");
    fd.set("overdue_annual_rate", String(overdueRate));
    fd.set("special_terms", specialTerms);
    fd.set("contract_source_type", channelObj.type);
    fd.set("contract_source_name", sourceName.trim() || channelObj.label);
    fd.set("contract_source_contact", sourceContact);
    fd.set("contract_source_memo", sourceMemo);
    fd.set("brokerage_fee", String(brokerageFee || 0));
    fd.set("brokerage_bearer", brokerageBearer);
    fd.set("prep_todos", allPrep.join(","));
    if (prevLeaseId) fd.set("prev_lease_id", prevLeaseId);

    startTransition(async () => {
      const r = await upsertLease(lease?.id ?? null, fd);
      if (r.ok) {
        toast.success(mode === "create" ? "계약 초안이 저장되었습니다." : "수정되었습니다.");
        router.push(`/admin/leases/${r.id}`);
      } else {
        toast.error("저장 실패", { description: r.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {renew && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <strong>재계약 / 연장</strong> — 이전 계약 정보를 불러왔습니다. 날짜는 갱신 기간으로 자동 제안했으니, 월세·보증금 등 바뀐 부분만 수정 후 저장하세요. (이전 계약과 연결되어 기록됩니다)
        </div>
      )}
      {/* ── 계약 대상: 임대인 → 건물 → 호실 ── */}
      <Section title="계약 대상">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>계약 유형 *</Label>
            <select className={selectCls} value={leaseType} onChange={(e) => setLeaseType(e.target.value as "long_term" | "short_term")}>
              <option value="long_term">장기임대</option>
              <option value="short_term">단기임대</option>
            </select>
          </div>
          <div>
            <Label>임대인 *</Label>
            <select className={selectCls} value={landlordId} onChange={(e) => onLandlord(e.target.value)}>
              <option value="">선택</option>
              {options.landlords.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <Label>건물</Label>
            <select className={selectCls} value={buildingId} onChange={(e) => onBuilding(e.target.value)} disabled={!landlordId}>
              <option value="">{landlordId ? "전체 / 선택" : "임대인 먼저 선택"}</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label>호실 *</Label>
            <select className={selectCls} value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!landlordId}>
              <option value="">{landlordId ? "호실 선택" : "임대인 먼저 선택"}</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.properties?.name} · {u.unit_no}호</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* ── 임차인 (기존 선택 or 수기 입력) ── */}
      <Section title="임차인">
        <div className="flex gap-2 mb-3">
          <ModeBtn active={tenantMode === "existing"} onClick={() => setTenantMode("existing")}>기존 임차인 선택</ModeBtn>
          <ModeBtn active={tenantMode === "new"} onClick={() => setTenantMode("new")}>신규 임차인 직접 입력</ModeBtn>
        </div>
        {tenantMode === "existing" ? (
          <select className={selectCls.replace("mt-1.5 ", "")} value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="">선택</option>
            {options.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>임차인 이름 *</Label>
              <Input className={inputCls} value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="홍길동" />
            </div>
            <div>
              <Label>연락처 *</Label>
              <Input className={inputCls} value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} placeholder="010-0000-0000" />
            </div>
          </div>
        )}
      </Section>

      {/* ── 기간 ── */}
      <Section title="기간">
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label>계약일 *</Label><Input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><Label>입주일 (다를 수 있음)</Label><Input type="date" className={inputCls} value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} /></div>
          <div><Label>계약 종료일 *</Label><Input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
      </Section>

      {/* ── 금액·청구 ── */}
      <Section title="금액 · 청구">
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label>보증금 (원)</Label><Input type="number" className={inputCls} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} /></div>
          <div><Label>월세 (원)</Label><Input type="number" className={inputCls} value={rent} onChange={(e) => setRent(Number(e.target.value))} /></div>
          <div><Label>관리비 (원)</Label><Input type="number" className={inputCls} value={mgmtFee} onChange={(e) => setMgmtFee(Number(e.target.value))} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label>청구 주기 *</Label>
            <select className={selectCls} value={rentCycle} onChange={(e) => setRentCycle(e.target.value as "monthly" | "weekly" | "daily")}>
              <option value="monthly">매월</option>
              <option value="weekly">매주</option>
              <option value="daily">매일</option>
            </select>
          </div>
          <div>
            <Label>청구일 (매월 며칠, 1~31)</Label>
            <Input type="number" min={1} max={31} className={inputCls} value={rentCycle === "monthly" ? rentDay : ""} disabled={rentCycle !== "monthly"} onChange={(e) => setRentDay(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </div>
        <label className="flex items-center gap-2 pt-3 cursor-pointer text-sm">
          <input type="checkbox" className="h-4 w-4" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} />
          부가세 별도 청구 (월세·관리비의 10%)
        </label>
      </Section>

      {/* ── 수익 분배 (임대인 ↔ JNP) ── */}
      <Section title="수익 분배 (임대인 ↔ JNP)">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>분배 방식 *</Label>
            <select className={selectCls} value={feeMode} onChange={(e) => setFeeMode(e.target.value as "percent" | "fixed")}>
              <option value="percent">비율 (임대인 / JNP)</option>
              <option value="fixed">정액 (원)</option>
            </select>
          </div>
          {feeMode === "percent" ? (
            <>
              <div>
                <Label>임대인 비율 (%)</Label>
                <Input type="number" min={0} max={100} className={`${inputCls} bg-muted/40`} value={100 - jnpPercent} readOnly />
              </div>
              <div>
                <Label>JNP 비율 (%)</Label>
                <Input type="number" min={0} max={100} className={inputCls} value={jnpPercent} onChange={(e) => setJnpPercent(Math.min(100, Math.max(0, Number(e.target.value))))} />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <Label>위탁수수료 정액 (원)</Label>
              <Input type="number" min={0} className={inputCls} value={feeFixed} onChange={(e) => setFeeFixed(Number(e.target.value))} />
            </div>
          )}
        </div>
        <div className="mt-4 max-w-xs">
          <Label>연체 연이율 (%)</Label>
          <Input type="number" step="0.01" className={inputCls} value={overdueRate} onChange={(e) => setOverdueRate(Number(e.target.value))} />
        </div>
      </Section>

      {/* ── 지출 (부동산 중개수수료 등) ── */}
      <Section title="지출 (부동산 중개수수료 등)">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>부동산 중개수수료 (원)</Label>
            <Input type="number" min={0} className={inputCls} value={brokerageFee} onChange={(e) => setBrokerageFee(Number(e.target.value))} placeholder="0" />
          </div>
          <div>
            <Label>부담 주체</Label>
            <select className={selectCls} value={brokerageBearer} onChange={(e) => setBrokerageBearer(e.target.value as "jnp" | "owner" | "half")}>
              <option value="jnp">JNP 부담</option>
              <option value="owner">임대인 부담</option>
              <option value="half">반반 (5:5)</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">입력하면 저장 시 해당 호실 지출(수익분배)로 기록됩니다.</p>
      </Section>

      {/* ── 계약 경로 / 계약처 ── */}
      <Section title="계약 경로 / 계약처">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>계약 경로 *</Label>
            <select className={selectCls} value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label>계약처명 (수기)</Label>
            <Input className={inputCls} value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="예: 한빛공인중개사 / 직접 입력" />
          </div>
          <div>
            <Label>계약처 연락처</Label>
            <Input className={inputCls} value={sourceContact} onChange={(e) => setSourceContact(e.target.value)} placeholder="예: 02-000-0000" />
          </div>
        </div>
        <div className="mt-4">
          <Label>계약 경로 메모</Label>
          <Textarea rows={2} className="mt-1.5 text-base" value={sourceMemo} onChange={(e) => setSourceMemo(e.target.value)} placeholder="중개수수료·소개 경위 등 기록" />
        </div>
      </Section>

      {/* ── 입주 준비 할 일 ── */}
      <Section title="입주 준비 할 일">
        <div className="flex flex-wrap gap-2 mb-3">
          {PREP_PRESETS.map((t) => (
            <button type="button" key={t} onClick={() => togglePrep(t)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${prepSel.has(t) ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted border-input"}`}>
              {prepSel.has(t) ? "✓ " : "+ "}{t}
            </button>
          ))}
        </div>
        <Input className="h-11 text-base" value={prepCustom} onChange={(e) => setPrepCustom(e.target.value)} placeholder="직접 입력 (쉼표로 구분): 예) 보일러 점검, 방충망 교체" />
        <p className="text-xs text-muted-foreground mt-2">저장 시 선택한 항목이 &quot;할 일&quot;로 등록됩니다.</p>
      </Section>

      {/* ── 입력자 / 특약 ── */}
      <Section title="입력자 · 특약">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>입력자</Label>
            <Input className={inputCls} value={recorder} onChange={(e) => setRecorder(e.target.value)} placeholder="작성자 이름" />
          </div>
          <div className="sm:col-span-2">
            <Label>특약사항</Label>
            <Textarea rows={2} className="mt-1.5 text-base" value={specialTerms} onChange={(e) => setSpecialTerms(e.target.value)} />
          </div>
        </div>
      </Section>

      {/* ── 카카오톡 복사용 계약정보 ── */}
      <div className="rounded-lg border-2 border-primary/30 bg-primary/[0.03] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4 text-primary" /> 카카오톡 복사용 계약정보</p>
          <Button type="button" size="sm" className="gap-1" onClick={copySummary}><Copy className="h-3.5 w-3.5" /> 복사</Button>
        </div>
        <Textarea readOnly value={summary} rows={Math.min(16, summary.split("\n").length + 1)} className="text-sm font-mono bg-background" />
        <p className="text-xs text-muted-foreground mt-2">입력값이 바뀌면 자동 갱신됩니다. 복사해서 카카오톡에 붙여넣으세요. (보내지 않아도 됩니다)</p>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === "create" ? "초안 저장" : "수정"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-bold text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm border transition ${active ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted border-input"}`}>
      {children}
    </button>
  );
}
