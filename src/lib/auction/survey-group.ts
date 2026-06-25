// 답사지 지역 그룹/정렬 — PDF·엑셀·행계산이 공유하는 순수 로직(외부 의존 없음).
// .tsx(JSX) 밖으로 빼서 node 테스트에서도 그대로 import 할 수 있게 한다.

export function regionKey(address: string): string {
  const parts = (address || "").trim().split(/\s+/);
  return parts.slice(0, 3).join(" ") || "(지역 미상)";
}

// 지역별 그룹 + 정렬. PDF 레이아웃과 번호 부여(route)가 동일 순서를 쓰도록 공유.
// 지역 내에서 임대인명 → 주소순으로 정렬해 같은 임대인의 물건이 인접하도록 한다.
export function groupByRegion<T extends { address: string; owner_name?: string | null }>(
  items: T[],
): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = regionKey(it.address);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  for (const [, list] of m)
    list.sort(
      (a, b) =>
        (a.owner_name ?? "").localeCompare(b.owner_name ?? "") || a.address.localeCompare(b.address),
    );
  return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

// 답사지에 인쇄되는 순서대로 평탄화 (지역별 그룹·동선 정렬).
export function flattenInPrintOrder<T extends { address: string }>(items: T[]): T[] {
  return groupByRegion(items).flatMap(([, list]) => list);
}
