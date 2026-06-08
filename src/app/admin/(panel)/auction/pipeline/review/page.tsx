import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReviewCard, type ReviewItem } from "./review-card";

export const metadata: Metadata = { title: "답사 검토" };
export const dynamic = "force-dynamic";

type InspRow = {
  id: string;
  auction_property_id: string;
  inspector_name: string;
  occupancy: string | null;
  mail_status: string | null;
  can_open: string | null;
  merchandising_ready: string | null;
  comment: string | null;
  auction_property: { case_number: string; address: string; owner_name: string | null; pipeline_state: string } | null;
};

async function fetchReviewables(): Promise<ReviewItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_inspection")
      .select(
        "id, auction_property_id, inspector_name, occupancy, mail_status, can_open, merchandising_ready, comment, auction_property:auction_property_id(case_number, address, owner_name, pipeline_state)",
      )
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true });

    return ((data ?? []) as InspRow[])
      .filter((r) => r.auction_property?.pipeline_state === "Reviewing")
      .map((r) => ({
        inspection_id: r.id,
        property_id: r.auction_property_id,
        case_number: r.auction_property?.case_number ?? "",
        address: r.auction_property?.address ?? "",
        owner_name: r.auction_property?.owner_name ?? null,
        inspector_name: r.inspector_name,
        occupancy: r.occupancy,
        mail_status: r.mail_status,
        can_open: r.can_open,
        merchandising_ready: r.merchandising_ready,
        comment: r.comment,
      }));
  } catch {
    return [];
  }
}

export default async function ReviewPage() {
  const items = await fetchReviewables();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 파이프라인
        </Link>
        <h1 className="text-xl font-black mt-2">④ 답사 검토</h1>
        <p className="text-sm text-muted-foreground mt-1">
          제출된 답사 결과를 검토해 승인/재확인/점유중/제외를 결정합니다. <strong>공실 + 개문가능</strong>을 승인하면 상품화준비로 바로 넘어갑니다. 총{" "}
          <strong className="text-foreground">{items.length}</strong>건.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          검토 대기 중인 답사가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => (
            <ReviewCard key={it.inspection_id} it={it} />
          ))}
        </div>
      )}
    </div>
  );
}
