import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InspectionForm } from "./inspection-form";

export const metadata: Metadata = { title: "답사 입력" };
export const dynamic = "force-dynamic";

type InspectionRow = {
  id: string;
  auction_property_id: string;
  status: string;
  occupancy: string | null;
  mail_status: string | null;
  key_needed: boolean | null;
  can_open: string | null;
  open_memo: string | null;
  merchandising_ready: string | null;
  comment: string | null;
  inspector_name: string;
  auction_property: {
    case_number: string;
    court: string | null;
    address: string;
    owner_name: string | null;
    category: string | null;
  } | null;
};

export default async function InspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("auction_inspection")
    .select(
      "id, auction_property_id, status, occupancy, mail_status, key_needed, can_open, open_memo, merchandising_ready, comment, inspector_name, auction_property:auction_property_id(case_number, court, address, owner_name, category)",
    )
    .eq("id", id)
    .maybeSingle();

  const insp = data as InspectionRow | null;
  if (!insp) notFound();

  const p = insp.auction_property;
  const readonly = insp.status !== "assigned";

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/inspect" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 답사 목록
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="font-mono text-sm font-semibold">{p?.case_number}</div>
        <div className="mt-1 flex items-start gap-1.5 text-sm">
          <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <span>{p?.address}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {[p?.court, p?.category, p?.owner_name].filter(Boolean).join(" · ")}
        </div>
      </div>

      <InspectionForm
        inspectionId={insp.id}
        propertyId={insp.auction_property_id}
        readonly={readonly}
        initial={{
          occupancy: (insp.occupancy ?? "") as never,
          mailStatus: (insp.mail_status ?? "") as never,
          keyNeeded: insp.key_needed ?? false,
          canOpen: (insp.can_open ?? "") as never,
          openMemo: insp.open_memo ?? "",
          merchandisingReady: (insp.merchandising_ready ?? "") as never,
          comment: insp.comment ?? "",
        }}
      />
    </div>
  );
}
