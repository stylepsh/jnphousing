import { describe, it, expect } from "vitest";
import { mergeCart, removeFromCart, groupCartByOwner, cartToText, type CartItem } from "./selection-cart";

const it1: CartItem = { id: "1", owner_name: "김철수", address: "인천 부평구 부평동 1", case_number: "2024타경1" };
const it2: CartItem = { id: "2", owner_name: "김철수", address: "인천 부평구 부평동 2", case_number: "2024타경2" };
const it3: CartItem = { id: "3", owner_name: "박영희", address: "부천 원미구 중동 3", case_number: "" };

describe("selection-cart", () => {
  it("검색을 바꿔 담아도 앞서 담은 것이 남는다", () => {
    const first = mergeCart([], [it1, it2]);
    const second = mergeCart(first, [it3]);
    expect(second.map((c) => c.id)).toEqual(["1", "2", "3"]);
  });

  it("같은 물건을 또 담아도 한 번만", () => {
    expect(mergeCart([it1], [it1, it2]).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("빼기", () => {
    expect(removeFromCart([it1, it2, it3], ["1", "3"]).map((c) => c.id)).toEqual(["2"]);
  });

  it("임대인별로 묶고 많이 가진 순으로 정렬", () => {
    const g = groupCartByOwner([it3, it1, it2]);
    expect(g.map((x) => [x.owner, x.items.length])).toEqual([
      ["김철수", 2],
      ["박영희", 1],
    ]);
  });

  it("소유자 미상도 한 묶음으로", () => {
    const g = groupCartByOwner([{ ...it1, owner_name: "  " }]);
    expect(g[0].owner).toBe("(소유자 미상)");
  });

  it("취합본 텍스트에 총계·임대인·주소가 담긴다", () => {
    const t = cartToText([it1, it2, it3]);
    expect(t).toContain("답사 취합 3건 · 임대인 2명");
    expect(t).toContain("[김철수] 2건");
    expect(t).toContain("1. 인천 부평구 부평동 1 (2024타경1)");
    expect(t).toContain("[박영희] 1건");
  });
});

describe("selection-cart 전역 저장소", () => {
  it("어느 화면에서 담아도 같은 바구니를 보고, 구독자에게 알린다", async () => {
    const { getCart, updateCart, subscribeCart } = await import("./selection-cart");
    let notified = 0;
    const unsub = subscribeCart(() => {
      notified += 1;
    });
    updateCart([it1]);
    expect(getCart().map((c) => c.id)).toEqual(["1"]);
    updateCart((prev) => mergeCart(prev, [it2]));
    expect(getCart().map((c) => c.id)).toEqual(["1", "2"]);
    expect(notified).toBe(2);
    updateCart([]);
    expect(getCart()).toEqual([]);
    unsub();
  });
});
