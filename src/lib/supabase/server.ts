import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 환경변수 미설정 시 throw 대신 sentinel 값 사용.
 * 호출부의 try/catch 가 잡거나, page level 에서 empty fallback 으로 처리.
 */
function ensureEnv(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase 환경변수가 설정되지 않았습니다. .env.local 의 NEXT_PUBLIC_SUPABASE_URL/ANON_KEY 를 채워주세요.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export async function createClient() {
  const env = ensureEnv();
  if (!env) throw new SupabaseNotConfiguredError();

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

/** 서비스 롤(관리자 작업 전용) — Server-only 라우트에서만 사용. */
export function createServiceClient() {
  const env = ensureEnv();
  if (!env) throw new SupabaseNotConfiguredError();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new SupabaseNotConfiguredError();
  }
  return createServerClient(env.url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}

/** Supabase 미설정 여부 — 페이지 단에서 안내 표시용. */
export function isSupabaseConfigured(): boolean {
  return ensureEnv() !== null && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
