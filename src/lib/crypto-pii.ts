/**
 * PII 암호화 (P30-94).
 *
 * 계좌번호·주민번호·사업자번호 등 민감 데이터 암호화.
 * AES-256-GCM 사용. PII_ENCRYPTION_KEY env 필요 (32바이트 hex).
 *
 * 키 정책 (fail-closed):
 *   운영(NODE_ENV=production)에서 PII_ENCRYPTION_KEY 가 없거나 형식이 틀리면
 *   평문으로 저장하지 않고 저장 자체를 중단한다. 개발에서만 평문 폴백을 허용한다.
 */

import { webcrypto } from "crypto";

/** 암호화 키가 없어 저장을 중단했을 때. 호출부는 사용자에게 실패를 알려야 한다. */
export class PiiKeyMissingError extends Error {
  constructor(reason: string) {
    super(`PII 암호화 키가 없어 저장할 수 없습니다 (${reason}).`);
    this.name = "PiiKeyMissingError";
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** 키 로드 실패 사유. 성공하면 null. */
let lastKeyFailure: string | null = null;

async function getKey(): Promise<CryptoKey | null> {
  // 호출 시점에 env 를 읽는다(모듈 로드 시점 캡처 회피 — 서버리스/테스트 모두 견고).
  const keyHex = process.env.PII_ENCRYPTION_KEY;
  if (!keyHex) {
    lastKeyFailure = "PII_ENCRYPTION_KEY 미설정";
    return null;
  }
  try {
    const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    if (keyBytes.length !== 32) {
      lastKeyFailure = "PII_ENCRYPTION_KEY 길이 오류(32바이트=64 hex 필요)";
      console.error("[crypto-pii]", lastKeyFailure);
      return null;
    }
    lastKeyFailure = null;
    return await webcrypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  } catch (e) {
    lastKeyFailure = "PII_ENCRYPTION_KEY 로드 실패";
    console.error("[crypto-pii] key load failed", e);
    return null;
  }
}

/**
 * 평문 → "v1:iv:ciphertext" base64 형식.
 * 운영에서 키가 없거나 암호화가 실패하면 PiiKeyMissingError 를 throw 한다(평문 저장 금지).
 * 개발에서는 기존대로 평문을 반환해 로컬 작업을 막지 않는다.
 */
export async function encryptPII(plain: string): Promise<string> {
  if (!plain) return "";
  const key = await getKey();
  if (!key) {
    const reason = lastKeyFailure ?? "키 없음";
    if (isProduction()) {
      console.error("[crypto-pii] 저장 중단 —", reason);
      throw new PiiKeyMissingError(reason);
    }
    console.warn("[crypto-pii] 개발 모드 — 평문 저장:", reason);
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
    console.error("[crypto-pii] encrypt failed", e);
    if (isProduction()) throw new PiiKeyMissingError("암호화 실패");
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
