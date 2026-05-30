import { describe, it, expect, beforeAll } from "vitest";
import { maskAccount, maskIdNumber, maskBusinessNumber } from "@/lib/crypto-pii";

// 32바이트(64 hex) 테스트 키 — 실제 운영 키 아님.
const TEST_KEY = "0".repeat(64);

describe("crypto-pii 마스킹", () => {
  it("maskAccount: 앞4·뒤4만 노출", () => {
    expect(maskAccount("110234567890")).toBe("1102****7890");
    expect(maskAccount("12345")).toBe("***"); // 6자 미만
  });

  it("maskIdNumber: 앞6 + 뒤 마스킹", () => {
    expect(maskIdNumber("9001011234567")).toBe("900101-*******");
    expect(maskIdNumber("123")).toBe("***");
  });

  it("maskBusinessNumber: 앞3 + 뒤5 노출", () => {
    expect(maskBusinessNumber("3612702026")).toBe("361-**-02026");
    expect(maskBusinessNumber("123")).toBe("***");
  });
});

describe("crypto-pii 암복호화 (키 있음)", () => {
  beforeAll(() => {
    process.env.PII_ENCRYPTION_KEY = TEST_KEY;
  });

  it("encrypt → decrypt 라운드트립이 평문을 복원한다", async () => {
    const { encryptPII, decryptPII } = await import("@/lib/crypto-pii");
    const plain = "110-234-567890";
    const enc = await encryptPII(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc).not.toContain(plain);
    expect(await decryptPII(enc)).toBe(plain);
  });

  it("빈 문자열은 그대로 빈 문자열", async () => {
    const { encryptPII, decryptPII } = await import("@/lib/crypto-pii");
    expect(await encryptPII("")).toBe("");
    expect(await decryptPII("")).toBe("");
  });

  it("같은 평문도 매번 다른 암호문(IV 무작위)", async () => {
    const { encryptPII } = await import("@/lib/crypto-pii");
    const a = await encryptPII("동일값");
    const b = await encryptPII("동일값");
    expect(a).not.toBe(b);
  });

  it("decrypt는 평문(v1: 접두어 없음)을 그대로 통과시킨다", async () => {
    const { decryptPII } = await import("@/lib/crypto-pii");
    expect(await decryptPII("이미평문")).toBe("이미평문");
  });
});
