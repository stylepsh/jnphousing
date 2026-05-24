/**
 * Rate Limiting (P30-99).
 *
 * Upstash Redis 있으면 분산 sliding-window, 없으면 메모리 fallback.
 * 박성혁 원칙 #7 (외부 연동 try/catch + fallback).
 */

type LimitResult = { success: boolean; remaining: number; reset: number };

const memoryBuckets = new Map<string, { count: number; reset: number }>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function memoryLimit(key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  const b = memoryBuckets.get(key);
  if (!b || b.reset < now) {
    memoryBuckets.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }
  b.count += 1;
  if (b.count > max) return { success: false, remaining: 0, reset: b.reset };
  return { success: true, remaining: max - b.count, reset: b.reset };
}

async function upstashLimit(key: string, max: number, windowSeconds: number): Promise<LimitResult> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const res = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });
    const data = await res.json();
    const count = Number(data.result ?? 0);
    if (count === 1) {
      await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: "no-store",
      });
    }
    if (count > max) return { success: false, remaining: 0, reset: (now + windowSeconds) * 1000 };
    return { success: true, remaining: max - count, reset: (now + windowSeconds) * 1000 };
  } catch (e) {
    console.warn("[upstashLimit] failed, falling back to memory", e);
    return memoryLimit(key, max, windowSeconds * 1000);
  }
}

/**
 * IP 기반 rate limit.
 * @param ip 클라이언트 IP
 * @param scope 라우트·용도 식별자 (예: "form-contact", "auth-login")
 * @param max  허용 최대 회수
 * @param windowSeconds 윈도우 길이 (초)
 */
export async function rateLimitByIp(
  ip: string,
  scope: string,
  max: number,
  windowSeconds: number
): Promise<LimitResult> {
  const key = `rl:${scope}:${ip}`;
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    return upstashLimit(key, max, windowSeconds);
  }
  return memoryLimit(key, max, windowSeconds * 1000);
}

/** 사전 정의된 정책 */
export const RATE_POLICIES = {
  publicForm: { max: 5,  windowSeconds: 60 },   // 공개 폼 (문의·민원) IP당 분당 5
  authLogin:  { max: 10, windowSeconds: 60 },   // 로그인 IP당 분당 10
  search:     { max: 30, windowSeconds: 60 },
  api:        { max: 60, windowSeconds: 60 },
} as const;
