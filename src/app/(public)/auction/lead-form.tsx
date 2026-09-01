"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { submitAuctionLead } from "./actions";
import { COMPANY } from "@/lib/company";

export function LeadForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await submitAuctionLead(fd);
      if (r.ok) {
        setDone(true);
        toast.success("접수되었습니다. 검토 후 연락드리겠습니다.");
      } else {
        toast.error(r.error);
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-amber-300 mx-auto mb-3" />
        <p className="text-white text-lg font-bold">접수가 완료되었습니다.</p>
        <p className="text-white/70 text-sm mt-2">담당자가 검토 후 연락드리겠습니다. 급하시면 {COMPANY.contact.phone}으로 전화 주세요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-6 md:p-8 space-y-4">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">건물 주소</label>
        <input
          name="building_address"
          required
          placeholder="예: 서울 은평구 갈현동 ○○○"
          className="w-full h-12 px-4 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 border-2 border-transparent focus:border-amber-400 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">연락처</label>
        <input
          name="phone"
          required
          inputMode="tel"
          placeholder="010-0000-0000"
          className="w-full h-12 px-4 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 border-2 border-transparent focus:border-amber-400 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl bg-amber-400 text-[#0F2B5B] hover:bg-amber-300 text-lg font-bold transition-all hover:shadow-2xl disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        무료 상담 신청
      </button>
      <p className="text-white/50 text-xs text-center">
        ※ 건물 주소·연락처만 남겨주시면 검토 후 연락드립니다. 광고·영업 전화 아닙니다.
      </p>
    </form>
  );
}
