import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function ensureEnv(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

/* =========================================================================
 * Mock Supabase 클라이언트 — env 미설정 시 graceful fallback.
 * 모든 chain 호출 가능 + await 시 빈 결과. 페이지 깨지지 않음.
 * 실제 운영 시는 env 설정 후 진짜 클라이언트 사용.
 * ========================================================================= */
function createMockClient(): unknown {
  type Result = { data: unknown; error: null; count?: number };
  const emptyArrayResult: Result = { data: [], error: null, count: 0 };
  const emptyNullResult: Result = { data: null, error: null };

  // QueryBuilder: 모든 chain 메서드가 자기 자신을 반환 + thenable
  const makeBuilder = (defaultResult: Result = emptyArrayResult): unknown => {
    const builder: Record<string, unknown> = {};
    const chainable = [
      "select", "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
      "like", "ilike", "or", "and", "filter", "match", "contains", "containedBy",
      "rangeGt", "rangeGte", "rangeLt", "rangeLte", "rangeAdjacent",
      "overlaps", "textSearch", "order", "limit", "range", "abortSignal",
      "throwOnError", "csv", "explain",
    ];
    for (const k of chainable) builder[k] = () => builder;

    builder.maybeSingle = async () => emptyNullResult;
    builder.single = async () => emptyNullResult;
    builder.insert = () => makeBuilder(emptyNullResult);
    builder.update = () => makeBuilder(emptyNullResult);
    builder.upsert = () => makeBuilder(emptyNullResult);
    builder.delete = () => makeBuilder(emptyNullResult);

    // thenable — `await supabase.from(...).select(...)` 가 바로 동작
    builder.then = (onFulfilled: (v: Result) => unknown) => Promise.resolve(defaultResult).then(onFulfilled);
    builder.catch = (fn: (e: unknown) => unknown) => Promise.resolve(defaultResult).catch(fn);

    return builder;
  };

  return {
    from: () => makeBuilder(),
    rpc: async () => emptyArrayResult,
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: { message: "환경변수 미설정" } }),
      signUp: async () => ({ data: { user: null }, error: { message: "환경변수 미설정" } }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ error: { message: "환경변수 미설정" } }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "환경변수 미설정" } }),
        download: async () => ({ data: null, error: { message: "환경변수 미설정" } }),
        createSignedUrl: async () => ({ data: null, error: { message: "환경변수 미설정" } }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        remove: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null }),
      }),
    },
  };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase 환경변수가 설정되지 않았습니다.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export async function createClient() {
  const env = ensureEnv();
  if (!env) {
    // graceful mock — 페이지가 throw 없이 빈 데이터로 렌더링
    return createMockClient() as ReturnType<typeof createServerClient>;
  }

  const cookieStore = await cookies();
  return createServerClient(env.url, env.anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component 에서 호출된 경우는 무시.
        }
      },
    },
  });
}

/**
 * 서비스 롤 — 서버 전용.
 * env 미설정 시 mock 반환 (페이지 깨지지 않음).
 * 실제 운영에서 mock이면 mutation 은 모두 no-op + error 반환.
 */
export function createServiceClient() {
  const env = ensureEnv();
  if (!env || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createMockClient() as ReturnType<typeof createServerClient>;
  }
  return createServerClient(env.url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}

/** Supabase 미설정 여부 — UI 안내 표시용. */
export function isSupabaseConfigured(): boolean {
  return ensureEnv() !== null && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
