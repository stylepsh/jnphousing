"use client";

import { useState } from "react";
import { toast } from "sonner";

export type IssueKind = "pdf" | "xlsx";

/**
 * 답사지 발급 공통 로직 — 지역 게이트와 물건 목록이 같은 경로를 쓰도록 한 곳에 모았다.
 * 팀 이름은 필수(발급 이력이 "팀 미기재"로 쌓이면 중복 배포 방지가 무력해진다).
 */
export function useIssueSheet() {
  const [issuing, setIssuing] = useState(false);

  async function issue(input: {
    ids: string[];
    team: string;
    kind: IssueKind;
    label?: string;
  }): Promise<boolean> {
    const { ids, kind } = input;
    const team = input.team.trim();
    if (ids.length === 0) {
      toast.error("발급할 물건이 없습니다.");
      return false;
    }
    if (!team) {
      toast.error("받는 답사팀을 입력해주세요. 발급 이력에 남아 중복 배포를 막아줍니다.");
      return false;
    }

    setIssuing(true);
    const endpoint =
      kind === "pdf"
        ? "/admin/auction/pipeline/survey-pdf"
        : "/admin/auction/pipeline/survey-xlsx";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, team }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "발급 실패");
        return false;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const safeLabel = (input.label ?? "답사지").replace(/[\\/:*?"<>|]/g, "_");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeLabel}_${team}_${date}_${ids.length}건.${kind}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (kind === "pdf") window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(`${team}에 ${ids.length}건 발급 — 발급 이력에 기록됨`);
      return true;
    } catch {
      toast.error("발급 중 오류가 발생했습니다.");
      return false;
    } finally {
      setIssuing(false);
    }
  }

  return { issue, issuing };
}
