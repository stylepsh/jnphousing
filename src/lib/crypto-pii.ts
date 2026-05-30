/**
 * PII 암호화 (P30-94).
 *
 * 계좌번호·주민번호·사업자번호 등 민감 데이터 암호화.
 * AES-256-GCM 사용. PII_ENCRYPTION_KEY env 필요 (32바이트 hex).
 *
 * 박성혁 원칙 #7: env 없으면 mock 모드 (개발용, 운영에는 키 필수).
 */

import { webcrypto } from "crypto";

async function getKey(): Promise<CryptoKey | null> {
  // 호출 시점에 env 를 읽는다(모듈 로드 시점 캡처 회피 — 서버리스/테스트 모두 견고).
  const keyHex = process.env.PII_ENCRYPTION_KEY;
  if (!keyHex) return null;
  try {
    const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    if (keyBytes.length !== 32) {
      console.warn("[crypto-pii] PII_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
      return null;
    }
    return await webcrypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  } catch (e) {
    console.warn("[crypto-pii] key load failed", e);
    return null;
  }
}

/** 평문 → "v1:iv:ciphertext" base64 형식. env 없으면 평문 그대로 (개발용). */
export async function encryptPII(plain: string): Promise<string> {
  if (!plain) return "";
  const key = await getKey();
  if (!key) {
    console.warn("[crypto-pii] PII_ENCRYPTION_KEY missing — storing plaintext (dev only)");
    return plain;
  }
  try {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(plain);
    const cipher = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    const ivB64 = Buffer.from(iv).toString("base64");
    const ctB64 = Buffer.from(cipher).toString("base64");
    return `v1:${ivB64}:${ctB64}`;
  } catch (e) {
    console.warn("[crypto-pii] encrypt failed", e);
    return plain;
  }
}

/** 암호문 → 평문. env 없거나 형식 안 맞으면 입력 그대로 반환. */
export async function decryptPII(encrypted: string): Promise<string> {
  if (!encrypted) return "";
  if (!encrypted.startsWith("v1:")) return encrypted; // 평문
  const key = await getKey();
  if (!key) return encrypted;
  try {
    const [, ivB64, ctB64] = encrypted.split(":");
    const iv = new Uint8Array(Buffer.from(ivB64, "base64"));
    const ct = new Uint8Array(Buffer.from(ctB64, "base64"));
    const data = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(data);
  } catch (e) {
    console.warn("[crypto-pii] decrypt failed", e);
    return encrypted;
  }
}

/** UI 표시용 마스킹 (예: 1111-22******-3333) */
export function maskAccount(plain: string): string {
  if (!plain || plain.length < 6) return "***";
  return plain.slice(0, 4) + "*".repeat(Math.max(plain.length - 8, 4)) + plain.slice(-4);
}

export function maskIdNumber(plain: string): string {
  if (!plain || plain.length < 7) return "***";
  return plain.slice(0, 6) + "-*******";
}

export function maskBusinessNumber(plain: string): string {
  if (!plain || plain.length < 10) return "***";
  return plain.slice(0, 3) + "-**-" + plain.slice(-5);
}
