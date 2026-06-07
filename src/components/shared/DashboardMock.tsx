import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { initial: string; name: string; amount: string; status: "paid" | "late" };

const ROWS: Row[] = [
  { initial: "박", name: "박○○빌딩", amount: "1,200,000", status: "paid" },
  { initial: "김", name: "김○○키테맘", amount: "850,000", status: "paid" },
  { initial: "정", name: "정○○하이츠", amount: "950,000", status: "paid" },
  { initial: "이", name: "이○○주택", amount: "700,000", status: "late" },
];

/**
 * JNP 관리 대시보드(월세징수 현황) 코드 목업.
 * 사진 대신 "제품 화면"으로 쓰는 프리미엄 비주얼. 정적(스크린샷 느낌).
 */
export function DashboardMock({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white border border-[#E8EBF0] shadow-2xl shadow-primary/10 overflow-hidden select-none", className)}>
      {/* 윈도우 바 */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#F0F2F6]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E2E6EE]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E2E6EE]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E2E6EE]" />
        <span className="ml-auto text-[11px] font-medium text-muted-foreground">JNP 관리 OS</span>
      </div>

      {/* 본문 */}
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-foreground">월세징수 현황</p>
          <span className="text-[11px] font-semibold text-primary bg-primary/8 rounded-full px-2.5 py-1">6월</span>
        </div>

        <div className="space-y-2">
          {ROWS.map((r) => (
            <div key={r.name} className="flex items-center gap-2.5 rounded-xl bg-[#F7F8FB] px-3 py-2.5">
              <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">{r.initial}</span>
              <span className="text-[13px] font-medium text-foreground truncate flex-1">{r.name}</span>
              <span className="text-[13px] tabular-nums text-foreground/70">{r.amount}</span>
              {r.status === "paid" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> 입금
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-full px-2 py-0.5 shrink-0">
                  <AlertTriangle className="h-3 w-3" /> 연체
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 요약 바 */}
        <div className="mt-4 rounded-xl bg-primary px-4 py-3.5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/70">이번 달 수금</p>
              <p className="text-lg font-bold tabular-nums leading-tight">2,500<span className="text-sm font-semibold">만원</span></p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/70">수금률</p>
              <p className="text-lg font-bold tabular-nums leading-tight">98%</p>
            </div>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white" style={{ width: "98%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
