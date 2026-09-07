export type DownloadKind = "pdf" | "xlsx";

const MIME_OF: Record<DownloadKind, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function hasExpectedSignature(bytes: Uint8Array, kind: DownloadKind): boolean {
  if (kind === "pdf") {
    return bytes.length >= 5
      && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44
      && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }
  return bytes.length >= 4
    && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export async function readValidatedDownload(response: Response, kind: DownloadKind): Promise<Blob> {
  if (response.redirected) {
    throw new Error("로그인이 만료되었습니다. 다시 로그인한 뒤 발급해 주세요.");
  }
  if (!response.ok) {
    throw new Error("파일 발급에 실패했습니다.");
  }

  const expectedMime = MIME_OF[kind];
  const mime = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (mime !== expectedMime) {
    throw new Error("서버가 올바른 파일 형식으로 응답하지 않았습니다.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!hasExpectedSignature(bytes, kind)) {
    throw new Error("다운로드 파일이 손상되었거나 올바른 형식이 아닙니다.");
  }
  return new Blob([bytes], { type: expectedMime });
}

export function getDownloadItemCount(response: Response, fallback: number): number {
  const raw = response.headers.get("x-jnp-todo-count");
  if (raw === null || !/^\d+$/.test(raw.trim())) return fallback;
  const count = Number(raw);
  return Number.isSafeInteger(count) ? count : fallback;
}

export function sanitizeDownloadFilenamePart(value: string, fallback = "답사지"): string {
  const safe = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .replace(/^[\s._-]+|[\s._-]+$/g, "")
    .slice(0, 60)
    .trim();
  return safe || fallback;
}
