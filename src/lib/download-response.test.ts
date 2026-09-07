import { describe, expect, it } from "vitest";
import { getDownloadItemCount, readValidatedDownload, sanitizeDownloadFilenamePart } from "./download-response";

describe("다운로드 응답 검증", () => {
  it("PDF와 XLSX의 MIME 및 파일 시그니처를 검증한다", async () => {
    const pdf = new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), {
      headers: { "Content-Type": "application/pdf" },
    });
    await expect(readValidatedDownload(pdf, "pdf")).resolves.toBeInstanceOf(Blob);

    const xlsx = new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    });
    await expect(readValidatedDownload(xlsx, "xlsx")).resolves.toBeInstanceOf(Blob);
  });

  it("redirect, HTML 위장 응답, 잘못된 시그니처를 거부한다", async () => {
    const redirected = new Response("%PDF-", { headers: { "Content-Type": "application/pdf" } });
    Object.defineProperty(redirected, "redirected", { value: true });
    await expect(readValidatedDownload(redirected, "pdf")).rejects.toThrow("로그인");

    const html = new Response("<html>login</html>", { headers: { "Content-Type": "text/html" } });
    await expect(readValidatedDownload(html, "pdf")).rejects.toThrow("형식");

    const fake = new Response("not-a-pdf", { headers: { "Content-Type": "application/pdf" } });
    await expect(readValidatedDownload(fake, "pdf")).rejects.toThrow("손상");
  });

  it("파일명에 사용할 수 없는 문자와 경로 문자를 제거한다", () => {
    expect(sanitizeDownloadFilenamePart("../수원:답사/팀*A? ")).toBe("수원_답사_팀_A");
    expect(sanitizeDownloadFilenamePart("   ")).toBe("답사지");
  });

  it("서버가 실제 신규 건수를 보낸 경우에만 파일명 건수로 사용한다", () => {
    expect(getDownloadItemCount(new Response(null), 12)).toBe(12);
    expect(getDownloadItemCount(new Response(null, { headers: { "X-JNP-Todo-Count": "7" } }), 12)).toBe(7);
    expect(getDownloadItemCount(new Response(null, { headers: { "X-JNP-Todo-Count": "NaN" } }), 12)).toBe(12);
  });
});
