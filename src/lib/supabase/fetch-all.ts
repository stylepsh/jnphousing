import "server-only";

/**
 * 전체 행 조회 — Supabase 기본 반환 상한(1,000행)과 하드코딩된 .limit() 을 대체한다.
 *
 * 기존 코드는 `.limit(2000)` 처럼 상한을 박아뒀는데, 데이터가 그 수를 넘으면
 * 오류 없이 조용히 잘려 합계·목록이 틀리게 나온다(운영 정합성 문제).
 * 여기서는 range 로 끝까지 읽고, 마지막 청크가 chunk 보다 작으면 종료한다.
 *
 * `max` 는 폭주 방지용 안전장치다. 도달하면 경고를 남긴다 — 조용히 자르지 않는다.
 */
export async function fetchAllRows<T>(
  label: string,
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  opts: { chunk?: number; max?: number } = {},
): Promise<{ rows: T[]; truncated: boolean; error?: string }> {
  const chunk = opts.chunk ?? 1000;
  const max = opts.max ?? 100_000;

  const rows: T[] = [];
  for (let from = 0; from < max; from += chunk) {
    const { data, error } = await build(from, from + chunk - 1);
    if (error) {
      console.error(`[fetchAllRows:${label}]`, error);
      return { rows, truncated: false, error: error.message };
    }
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < chunk) return { rows, truncated: false };
  }

  console.warn(`[fetchAllRows:${label}] 안전 상한 ${max}행 도달 — 결과가 잘렸다`);
  return { rows, truncated: true };
}
