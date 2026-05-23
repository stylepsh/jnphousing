"use server";

import { clearTenantSessionCookie } from "@/lib/tenant-session";

export async function tenantLogout() {
  await clearTenantSessionCookie();
  return { ok: true as const };
}
