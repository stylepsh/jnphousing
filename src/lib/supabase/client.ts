import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저 Supabase 클라이언트.
 * Database 제네릭은 의도적으로 빼서 .from() 추론 충돌을 피한다.
 * 호출부에서 `as Type` 으로 결과를 캐스팅한다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
