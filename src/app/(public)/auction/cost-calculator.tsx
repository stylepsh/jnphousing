"use client";

import { useState } from "react";

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full h-12 pl-3 pr-12 text-lg font-bold rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">만원</span>
      </div>
    </div>
  );
}

export function CostCalculator() {
  const [mgmt, setMgmt] = useState(30);
  const [utility, setUtility] = useState(40);
  const [cleaning, setCleaning] = useState(15);
  const [months, setMonths] = useState(12);

  const monthly = mgmt + utility + cleaning;
  const total = monthly * months;
  const fmt = (n: number) => n.toLocaleString("ko-KR");

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-8">
      <p className="text-sm font-semibold text-amber-600 mb-1">방치 비용 계산기</p>
      <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-6">
        공실로 두는 동안, 얼마가 새고 있을까요?
      </h3>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Field label="월 관리비" value={mgmt} onChange={setMgmt} />
        <Field label="월 공과금" value={utility} onChange={setUtility} />
        <Field label="월 청소비" value={cleaning} onChange={setCleaning} />
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-4">
        <span className="text-sm text-slate-500">월 합계</span>
        <span className="text-xl font-bold text-slate-900">{fmt(monthly)}만원</span>
        <span className="mx-1 text-slate-400">×</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={months}
            onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 h-9 px-2 text-center text-lg font-bold rounded-lg border-2 border-slate-200 focus:border-amber-400 outline-none"
          />
          <span className="text-sm text-slate-500">개월 (경매 기간)</span>
        </div>
      </div>

      <div className="rounded-xl bg-primary p-5 text-center">
        <p className="text-white/70 text-sm mb-1">방치 시 예상 총 손실</p>
        <p className="text-3xl md:text-4xl font-black text-amber-300 tabular-nums">
          {fmt(total)}<span className="text-xl ml-1">만원</span>
        </p>
        <p className="text-white/60 text-xs mt-2">
          낙찰 전까지 수익화하면 이 손실의 상당 부분을 회복할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
