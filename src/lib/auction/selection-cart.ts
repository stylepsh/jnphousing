/**
 * 답사지 취합 장바구니 — 여러 번의 검색을 넘나들며 고른 물건을 한곳에 모은다.
 *
 * 예전에는 선택 상태를 "지역·임대인·회차·페이지" 조합(scopeKey)별로 따로 저장해서,
 * 임대인 A 를 검색해 체크한 뒤 임대인 B 를 검색하면 A 의 체크가 사라졌다.
 * 그래서 한 명씩 나갔다 들어오며 발급해야 했다. 이제는 범위와 무관한 한 개의 장바구니에
 * 담기고, 담긴 물건 정보(임대인·주소·사건번호)도 같이 들고 다녀서
 * 지금 화면에 없는 물건까지 목록으로 정리해 한 번에 발급할 수 있다.
 */

export interface CartItem {
  id: string;
  owner_name: string;
  address: string;
  case_number: string;
}

export const CART_STORAGE_KEY = "auction-pool-cart";

/** 담기 — 같은 id 는 한 번만, 담은 순서를 유지한다. */
export function mergeCart(prev: CartItem[], add: CartItem[]): CartItem[] {
  const seen = new Set(prev.map((c) => c.id));
  return [...prev, ...add.filter((c) => c.id && !seen.has(c.id) && seen.add(c.id))];
}

export function removeFromCart(prev: CartItem[], ids: Iterable<string>): CartItem[] {
  const drop = new Set(ids);
  return prev.filter((c) => !drop.has(c.id));
}

/** 임대인별로 묶어 정리 — 많이 가진 임대인부터, 같으면 가나다순. */
export function groupCartByOwner(items: CartItem[]): { owner: string; items: CartItem[] }[] {
  const m = new Map<string, CartItem[]>();
  for (const c of items) {
    const owner = c.owner_name?.trim() || "(소유자 미상)";
    if (!m.has(owner)) m.set(owner, []);
    m.get(owner)!.push(c);
  }
  return Array.from(m.entries())
    .map(([owner, list]) => ({ owner, items: list }))
    .sort((a, b) => b.items.length - a.items.length || a.owner.localeCompare(b.owner, "ko"));
}

/** 취합본 텍스트 — 카톡·메모로 그대로 넘길 수 있는 정리본. */
export function cartToText(items: CartItem[]): string {
  const groups = groupCartByOwner(items);
  const head = `답사 취합 ${items.length}건 · 임대인 ${groups.length}명`;
  const body = groups.map(
    ({ owner, items: list }) =>
      `\n[${owner}] ${list.length}건\n` +
      list.map((c, i) => `  ${i + 1}. ${c.address}${c.case_number ? ` (${c.case_number})` : ""}`).join("\n"),
  );
  return [head, ...body].join("\n");
}

export function readCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is CartItem => !!c && typeof (c as CartItem).id === "string",
    );
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  try {
    if (items.length === 0) sessionStorage.removeItem(CART_STORAGE_KEY);
    else sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* 사파리 프라이빗 모드 등 저장 실패는 기능을 막지 않는다 */
  }
}
