/**
 * PDF 생성 + Storage 업로드 + presigned URL 발급.
 *
 * - admin server action: presignContract / presignReceipt
 * - tenant: 본인 lease 매칭 후 presignContract 허용
 */

import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

const PRESIGN_SECONDS = 5 * 60;

export async function presignContractUrl(lease_id: string, contract_file_path: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from("contracts")
      .createSignedUrl(contract_file_path, PRESIGN_SECONDS);
    if (error) {
      console.error("[presignContractUrl]", { lease_id, error });
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("[presignContractUrl] unhandled", e);
    return null;
  }
}

export async function uploadPdf(bucket: "contracts" | "receipts", path: string, body: Buffer): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, body, { contentType: "application/pdf", upsert: true });
    if (error) {
      console.error("[uploadPdf]", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, path };
  } catch (e) {
    console.error("[uploadPdf] unhandled", e);
    return { ok: false, error: "업로드 실패" };
  }
}
