import type { Metadata } from "next";
import { BulkInvoicesClient } from "./client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "청구서 일괄 작업" };
export const dynamic = "force-dynamic";

interface Invoice {
  id: string;
  unit_id: string;
  due_date: string;
  amount: number;
  status: string;
  paid_amount: number | null;
  tenants: { name: string } | null;
}

async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rent_invoices")
      .select("id, unit_id, due_date, amount, status, paid_amount, tenants(name)")
      .in("status", ["unpaid", "overdue", "partial"])
      .order("due_date", { ascending: false })
      .limit(200);
    return (data ?? []) as unknown as Invoice[];
  } catch {
    return [];
  }
}

export default async function BulkInvoicesPage() {
  const invoices = await fetchInvoices();
  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">청구서 일괄 작업</h1>
        <p className="mt-1 text-sm text-muted-foreground">여러 청구서를 선택해 상태 일괄 변경 · 미수금 {invoices.length}건</p>
      </div>
      <BulkInvoicesClient invoices={invoices} />
    </div>
  );
}
