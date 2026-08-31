import { describe, it, expect } from "vitest";
import { regionKey, groupByRegion, flattenInPrintOrder } from "./survey-group";

/**
 * 답사지 PDF 레이아웃과 번호 부여(route)가 같은 순서를 써야 한다.
 * 순서가 어긋나면 종이의 47번과 시스템의 47번이 다른 물건을 가리킨다.
 */
const items = [
  { address: "인천 부평구 부평동 222-2 스위트홈 204호", owner_name: "홍길동" },
  { address: "인천 부평구 부평동 111-1 가나빌라 101호", owner_name: "가나하우징" },
  { address: "인천 계양구 작전동 333-3 마바빌라 401호", owner_name: "홍길동" },
  { address: "인천 부평구 부평동 222-2 스위트홈 802호", owner_name: "홍길동" },
];

describe("regionKey — 주소 앞 3토큰", () => {
  it("시·구·동으로 묶는다", () => {
    expect(regionKey("인천 부평구 부평동 222-2 스위트홈 204호")).toBe("인천 부평구 부평동");
  });

  it("토큰이 모자라면 있는 만큼", () => {
    expect(regionKey("인천 부평구")).toBe("인천 부평구");
  });

  it("빈 주소는 미상", () => {
    expect(regionKey("")).toBe("(지역 미상)");
    expect(regionKey("   ")).toBe("(지역 미상)");
  });
});

describe("groupByRegion", () => {
  it("지역별로 나눈다", () => {
    const groups = groupByRegion(items);
    const keys = groups.map(([k]) => k);
    expect(keys).toContain("인천 부평구 부평동");
    expect(keys).toContain("인천 계양구 작전동");
    expect(groups.find(([k]) => k === "인천 부평구 부평동")?.[1]).toHaveLength(3);
  });

  it("지역 안에서는 임대인 → 주소 순 (같은 임대인이 붙어 있어야 동선이 산다)", () => {
    const [, list] = groupByRegion(items).find(([k]) => k === "인천 부평구 부평동")!;
    expect(list.map((i) => i.owner_name)).toEqual(["가나하우징", "홍길동", "홍길동"]);
    expect(list[1].address < list[2].address).toBe(true);
  });

  it("빈 배열도 안전", () => {
    expect(groupByRegion([])).toEqual([]);
  });
});

describe("flattenInPrintOrder", () => {
  it("그룹 순서를 그대로 펼친다 — 개수 보존", () => {
    expect(flattenInPrintOrder(items)).toHaveLength(items.length);
  });

  it("같은 지역 물건이 흩어지지 않는다", () => {
    const regions = flattenInPrintOrder(items).map((i) => regionKey(i.address));
    const changes = regions.filter((r, idx) => idx > 0 && r !== regions[idx - 1]).length;
    expect(changes).toBe(new Set(regions).size - 1);
  });
});
