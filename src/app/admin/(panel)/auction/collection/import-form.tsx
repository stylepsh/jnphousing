"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importAuctionText, type ImportResult } from "./actions";

export function AuctionImportForm() {
  const [text, setText] = useState("");
  const [batchName, setBatchName] = useState("");
  const [area, setArea] = useState("");
  const [targetOnly, setTargetOnly] = useState(true);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleImport() {
    if (!text.trim()) {
      toast.error("텍스트를 붙여넣어 주세요.");
      return;
    }
    startTransition(async () => {
      setLastResult(null);
      const data = await importAuctionText({
        text,
        batchName: batchName || undefined,
        area: area || undefined,
        targetOnly,
      });
      setLastResult(data);

      if (!data.ok) {
        toast.error(data.error ?? "임포트 실패");
        return;
      }
      const dupNote = data.duplicates > 0 ? ` (중복 ${data.duplicates}건 제외)` : "";
      toast.success(
        `보증채권 ${data.imported}건 임포트 (HUG ${data.importedHug} · SGI ${data.importedSgi})${dupNote}`,
      );
      setText("");
      setBatchName("");
      setArea("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      {/* ── 상단 실행 바: 긴 텍스트를 스크롤하지 않고 바로 저장 ── */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-1 flex items-center gap-2 flex-wrap border-b bg-card/95 px-4 py-3 backdrop-blur">
        <Button onClick={handleImport} disabled={pending} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {pending ? "수집 중…" : "파싱 후 저장"}
        </Button>
        {text && (
          <span className="text-xs text-muted-foreground">
            {text.split("\n").filter(Boolean).length}줄 입력됨
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block text-xs font-bold text-muted-foreground">
            배치 이름 (선택)
          </Label>
          <Input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="자동: 날짜 보증채권 임포트"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-bold text-muted-foreground">
            답사 지역 (선택)
          </Label>
          <Input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="예: 서울 강서구"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer">
        <input
          type="checkbox"
          checked={targetOnly}
          onChange={(e) => setTargetOnly(e.target.checked)}
          className="w-4 h-4"
        />
        <ShieldCheck className="w-4 h-4 text-blue-700" />
        <span className="text-sm font-bold text-blue-900">
          채권자 = 주택도시보증공사(HUG) 또는 서울보증보험(SGI) 만 수집
        </span>
        <span className="ml-auto text-[11px] text-blue-700">
          {targetOnly ? "필터 ON" : "필터 OFF (전체 수집)"}
        </span>
      </label>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-bold text-muted-foreground">
            경매 검색 결과 텍스트
            <span className="ml-1 text-[10px] text-muted-foreground/70">
              — 사건번호 / 주소 / 소유자 / 채권자 / 감정가 / 최저가 / 기일 자동 파싱
            </span>
          </Label>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="font-mono text-xs"
          placeholder="지지옥션·대법원 검색 결과를 여기에 붙여넣으세요."
        />
      </div>

      {lastResult && lastResult.parsedTotal > 0 && (
        <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
          <h3 className="text-sm font-bold">
            임포트 결과{lastResult.batchName ? ` — ${lastResult.batchName}` : ""}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat label="파싱 총건" value={lastResult.parsedTotal} color="slate" />
            <Stat label="HUG 주택보증" value={lastResult.hug} color="blue" />
            <Stat label="SGI 서울보증" value={lastResult.sgi} color="purple" />
            <Stat label="기타 (제외)" value={lastResult.other} color="amber" />
            <Stat label="중복 (제외)" value={lastResult.duplicates} color="amber" />
          </div>
          {lastResult.ok && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-xs font-bold text-emerald-700">실제 저장</div>
              <div className="text-2xl font-black text-emerald-900 mt-0.5">
                {lastResult.imported}건
                <span className="ml-3 text-sm font-bold text-emerald-700">
                  (HUG {lastResult.importedHug} · SGI {lastResult.importedSgi})
                </span>
              </div>
            </div>
          )}
          {Object.keys(lastResult.byOwner).length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">
                소유자별 건수 (저장된 것)
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(lastResult.byOwner)
                  .sort(([, a], [, b]) => b - a)
                  .map(([owner, count]) => (
                    <span
                      key={owner}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background border text-xs"
                    >
                      <span className="font-bold">{owner}</span>
                      <span className="text-muted-foreground">{count}건</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "slate" | "blue" | "purple" | "amber";
}) {
  const colors: Record<string, string> = {
    slate: "bg-background border-border text-foreground",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}
