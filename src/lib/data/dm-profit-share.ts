/**
 * JNP 단기임대 수익 분배 비율 정의 (P32).
 *
 * 박성혁 엑셀에서 실제 사용 중인 비율 + 자동 계산.
 */

export type ProfitShareRatio = "5:5" | "6:4" | "7:3" | "8:2" | "9:1" | "6:2:2" | "7:2:1" | "custom";

export interface ProfitShareDef {
  key: ProfitShareRatio;
  label: string;
  description: string;
  parties: ("landlord" | "company" | "third_party")[];
  splitPct: number[];   // 임대인 / 회사 / 제3자 순서로 %
}

export const PROFIT_SHARE_DEFS: ProfitShareDef[] = [
  {
    key: "5:5",
    label: "5 : 5",
    description: "임대인 50% · 회사 50% (절반)",
    parties: ["landlord", "company"],
    splitPct: [50, 50],
  },
  {
    key: "6:4",
    label: "6 : 4",
    description: "임대인 60% · 회사 40%",
    parties: ["landlord", "company"],
    splitPct: [60, 40],
  },
  {
    key: "7:3",
    label: "7 : 3",
    description: "임대인 70% · 회사 30% (가장 흔한 분배)",
    parties: ["landlord", "company"],
    splitPct: [70, 30],
  },
  {
    key: "8:2",
    label: "8 : 2",
    description: "임대인 80% · 회사 20% (임대인 우대)",
    parties: ["landlord", "company"],
    splitPct: [80, 20],
  },
  {
    key: "9:1",
    label: "9 : 1",
    description: "임대인 90% · 회사 10% (저관여 운영)",
    parties: ["landlord", "company"],
    splitPct: [90, 10],
  },
  {
    key: "6:2:2",
    label: "6 : 2 : 2",
    description: "임대인 60% · 회사 20% · 제3자 20%",
    parties: ["landlord", "company", "third_party"],
    splitPct: [60, 20, 20],
  },
  {
    key: "7:2:1",
    label: "7 : 2 : 1",
    description: "임대인 70% · 회사 20% · 제3자 10%",
    parties: ["landlord", "company", "third_party"],
    splitPct: [70, 20, 10],
  },
  {
    key: "custom",
    label: "사용자 지정",
    description: "JSON 으로 % 직접 설정",
    parties: ["landlord", "company", "third_party"],
    splitPct: [0, 0, 0],
  },
];

/**
 * 수익을 분배 비율로 계산
 */
export function calculateProfitShare(
  revenue: number,
  ratio: ProfitShareRatio,
  customPct?: { landlord: number; company: number; thirdParty?: number }
): { landlord: number; company: number; thirdParty: number } {
  const def = PROFIT_SHARE_DEFS.find(d => d.key === ratio);
  if (!def) {
    return { landlord: 0, company: 0, thirdParty: 0 };
  }

  if (ratio === "custom" && customPct) {
    return {
      landlord: Math.round(revenue * (customPct.landlord / 100)),
      company: Math.round(revenue * (customPct.company / 100)),
      thirdParty: Math.round(revenue * ((customPct.thirdParty ?? 0) / 100)),
    };
  }

  const [lp, cp, tp = 0] = def.splitPct;
  return {
    landlord: Math.round(revenue * (lp / 100)),
    company: Math.round(revenue * (cp / 100)),
    thirdParty: Math.round(revenue * (tp / 100)),
  };
}

export function getProfitShareDef(ratio: string): ProfitShareDef {
  return PROFIT_SHARE_DEFS.find(d => d.key === ratio) ?? PROFIT_SHARE_DEFS[0];
}
