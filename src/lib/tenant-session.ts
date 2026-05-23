/**
 * 임차인 세션 (lightweight JWT).
 *
 * 본인 인증:
 * - phone last4 + property_id + unit_no 조합으로 매칭 → JWT 발급 (24h)
 * - httpOnly cookie 에 저장. CSRF 방어는 same-site lax + state-changing 작업 시 server action.
 *
 * Brute force 방지:
 * - 동일 IP 5회/10분 lock (rateLimit 활용)
 */

import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "tenant_session";
const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.TENANT_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("TENANT_AUTH_SECRET 환경변수가 없거나 너무 짧습니다 (32자+).");
  }
  return new TextEncoder().encode(secret);
}

export interface TenantSession extends JWTPayload {
  tenant_id: string;
  lease_id: string;
  unit_id: string;
}

export async function signTenantSession(payload: Omit<TenantSession, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .setIssuer("jnp-housing")
    .setAudience("tenant")
    .sign(getSecret());
}

export async function verifyTenantSession(token: string): Promise<TenantSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "jnp-housing",
      audience: "tenant",
    });
    return payload as TenantSession;
  } catch {
    return null;
  }
}

export async function setTenantSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearTenantSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getTenantSession(): Promise<TenantSession | null> {
  try {
    const c = await cookies();
    const token = c.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyTenantSession(token);
  } catch {
    return null;
  }
}
