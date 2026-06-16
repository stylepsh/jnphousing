// 서버/클라 공용 (NOT "use server") — 호실 일괄 생성 호번 규칙. 폼 미리보기와 서버가 동일 사용.

/**
 * 층 호번 조합 생성. 예: floor=2, n=1, pad=2 → "201". floor=13 → "1301".
 * 2층~13층, 층당 5호 → 201~205, 301~305, … 1301~1305.
 */
export function buildUnitNos(
  floorFrom: number, floorTo: number, perFloor: number, startNo: number, pad: number,
): { unitNo: string; floor: number }[] {
  const out: { unitNo: string; floor: number }[] = [];
  const lo = Math.min(floorFrom, floorTo);
  const hi = Math.max(floorFrom, floorTo);
  for (let f = lo; f <= hi; f++) {
    if (f === 0) continue; // 0층 제외
    for (let n = startNo; n < startNo + perFloor; n++) {
      out.push({ unitNo: `${f}${String(n).padStart(pad, "0")}`, floor: f });
    }
  }
  return out;
}
