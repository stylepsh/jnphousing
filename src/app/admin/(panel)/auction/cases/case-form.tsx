"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AUCTION_STAGE, AUCTION_STAGE_ORDER, CASE_TYPES } from "@/lib/auction/case-stages";
import { createCase, updateCase, type CaseInput } from "./actions";

export type PoolOption = {
  id: string;
  case_number: string;
  court: string | null;
  address: string;
  owner_name: string | null;
  appraisal_value: number | null;
  minimum_bid: number | null;
  dividend_deadline: string | null;
};

type FormState = {
  auctionPropertyId: string;
  propertyLabel: string;
  caseNumber: string;
  court: string;
  caseType: string;
  stage: string;
  auctionDate: string;
  appraisalValue: string;
  minimumBid: string;
  claimAmount: string;
  auctionUrl: string;
  lawsuitStatus: string;
  seizureStatus: string;
  collectionStatus: string;
  seizureTarget: string;
  seizureAmount: string;
  thirdDebtor: string;
  filingDate: string;
  decisionDate: string;
  dividendDeadline: string;
  tenantResponse: string;
  assignedLawyer: string;
  lawyerContact: string;
  submittedDocs: string;
  courtDates: string;
  recoveryMemo: string;
  memo: string;
};

const EMPTY: FormState = {
  auctionPropertyId: "",
  propertyLabel: "",
  caseNumber: "",
  court: "",
  caseType: "",
  stage: "filed",
  auctionDate: "",
  appraisalValue: "",
  minimumBid: "",
  claimAmount: "",
  auctionUrl: "",
  lawsuitStatus: "",
  seizureStatus: "",
  collectionStatus: "",
  seizureTarget: "",
  seizureAmount: "",
  thirdDebtor: "",
  filingDate: "",
  decisionDate: "",
  dividendDeadline: "",
  tenantResponse: "",
  assignedLawyer: "",
  lawyerContact: "",
  submittedDocs: "",
  courtDates: "",
  recoveryMemo: "",
  memo: "",
};

export function CaseForm({
  pool,
  initial,
  caseId,
}: {
  pool: PoolOption[];
  initial?: Partial<FormState>;
  caseId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...EMPTY, ...initial });
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // 풀에서 물건 선택 → 사건 필드 자동 채움
  function pickPool(id: string) {
    set("auctionPropertyId", id);
    const p = pool.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({
      ...f,
      auctionPropertyId: id,
      caseNumber: f.caseNumber || p.case_number,
      court: f.court || p.court || "",
      propertyLabel: f.propertyLabel || `${p.address}${p.owner_name ? ` (${p.owner_name})` : ""}`,
      appraisalValue: f.appraisalValue || (p.appraisal_value ? String(p.appraisal_value) : ""),
      minimumBid: f.minimumBid || (p.minimum_bid ? String(p.minimum_bid) : ""),
      dividendDeadline: f.dividendDeadline || (p.dividend_deadline ?? ""),
    }));
  }

  function submit() {
    if (!form.caseNumber.trim()) {
      toast.error("사건번호는 필수입니다.");
      return;
    }
    startTransition(async () => {
      const payload = form as unknown as CaseInput;
      const res = caseId ? await updateCase(caseId, payload) : await createCase(payload);
      if (!res.ok) {
        toast.error(res.error ?? "저장 실패");
        return;
      }
      toast.success(caseId ? "사건이 수정되었습니다." : "경매/법무 사건이 등록되었습니다.");
      router.push("/admin/auction/cases");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* 기본 정보 */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-sm font-black">기본 정보</h2>

        {pool.length > 0 && (
          <div className="space-y-1.5">
            <Label>수집 풀에서 연결 (선택)</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.auctionPropertyId}
              onChange={(e) => pickPool(e.target.value)}
            >
              <option value="">연결 안 함 (직접 입력)</option>
              {pool.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.case_number} · {p.address}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>물건/주소 표기</Label>
          <Input
            value={form.propertyLabel}
            onChange={(e) => set("propertyLabel", e.target.value)}
            placeholder="예: 서울 은평구 갈현동 521-22 하나블루힐스 202호"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>사건번호 *</Label>
            <Input
              value={form.caseNumber}
              onChange={(e) => set("caseNumber", e.target.value)}
              placeholder="예: 2024타경12345"
            />
          </div>
          <div className="space-y-1.5">
            <Label>관할법원</Label>
            <Input
              value={form.court}
              onChange={(e) => set("court", e.target.value)}
              placeholder="예: 서울서부지방법원"
            />
          </div>
          <div className="space-y-1.5">
            <Label>사건유형</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.caseType}
              onChange={(e) => set("caseType", e.target.value)}
            >
              <option value="">선택</option>
              {CASE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>현재 단계</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.stage}
              onChange={(e) => set("stage", e.target.value)}
            >
              {AUCTION_STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {AUCTION_STAGE[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>매각기일</Label>
            <Input type="date" value={form.auctionDate} onChange={(e) => set("auctionDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>배당요구종기일</Label>
            <Input
              type="date"
              value={form.dividendDeadline}
              onChange={(e) => set("dividendDeadline", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 금액 정보 */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-sm font-black">금액 정보 <span className="text-xs font-normal text-muted-foreground">(원 단위)</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>감정가</Label>
            <Input type="number" min={0} value={form.appraisalValue} onChange={(e) => set("appraisalValue", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>최저입찰가</Label>
            <Input type="number" min={0} value={form.minimumBid} onChange={(e) => set("minimumBid", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>채권액</Label>
            <Input type="number" min={0} value={form.claimAmount} onChange={(e) => set("claimAmount", e.target.value)} />
          </div>
        </div>
      </section>

      {/* 법무/추심 */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-sm font-black">법무 · 추심 진행</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>소송 상태</Label>
            <Input value={form.lawsuitStatus} onChange={(e) => set("lawsuitStatus", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>압류 상태</Label>
            <Input value={form.seizureStatus} onChange={(e) => set("seizureStatus", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>추심/징수 상태</Label>
            <Input value={form.collectionStatus} onChange={(e) => set("collectionStatus", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>압류 대상</Label>
            <Input value={form.seizureTarget} onChange={(e) => set("seizureTarget", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>압류액</Label>
            <Input type="number" min={0} value={form.seizureAmount} onChange={(e) => set("seizureAmount", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>제3채무자</Label>
            <Input value={form.thirdDebtor} onChange={(e) => set("thirdDebtor", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>제출일</Label>
            <Input type="date" value={form.filingDate} onChange={(e) => set("filingDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>결정일</Label>
            <Input type="date" value={form.decisionDate} onChange={(e) => set("decisionDate", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>세입자 대응 / HUG 상태</Label>
          <Textarea rows={2} value={form.tenantResponse} onChange={(e) => set("tenantResponse", e.target.value)} />
        </div>
      </section>

      {/* 담당 & 링크 */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-sm font-black">담당 · 링크</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>담당 변호사/법무사</Label>
            <Input value={form.assignedLawyer} onChange={(e) => set("assignedLawyer", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>연락처</Label>
            <Input value={form.lawyerContact} onChange={(e) => set("lawyerContact", e.target.value)} placeholder="010-0000-0000" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>경매사이트 URL</Label>
          <Input value={form.auctionUrl} onChange={(e) => set("auctionUrl", e.target.value)} placeholder="https://www.courtauction.go.kr/..." />
        </div>
        <div className="space-y-1.5">
          <Label>제출 문서 목록</Label>
          <Textarea rows={2} value={form.submittedDocs} onChange={(e) => set("submittedDocs", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>기일 일정</Label>
          <Textarea rows={2} value={form.courtDates} onChange={(e) => set("courtDates", e.target.value)} />
        </div>
      </section>

      {/* 메모 */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-sm font-black">메모</h2>
        <div className="space-y-1.5">
          <Label>회수가능성 메모</Label>
          <Textarea rows={3} value={form.recoveryMemo} onChange={(e) => set("recoveryMemo", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>기타 메모</Label>
          <Textarea rows={2} value={form.memo} onChange={(e) => set("memo", e.target.value)} />
        </div>
      </section>

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "저장 중..." : caseId ? "수정 저장" : "사건 등록"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/auction/cases")} disabled={pending}>
          취소
        </Button>
      </div>
    </div>
  );
}
