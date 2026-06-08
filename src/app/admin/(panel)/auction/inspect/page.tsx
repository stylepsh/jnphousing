import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "답사자 입력" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  status: string;
  inspector_name: string;
  auction_property: { case_number: string; address: string; owner_name: string | null } | null;
};

async function fetchInspections(): Promise<Row[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_inspection")
      .select("id, status, inspector_name, auction_property:auction_property_id(case_number, address, owner_name)")
      .order("assigned_at", { ascending: false });
    return (data ?? []) as Row[];
  } catch {
    return [];
  }
}

const SECTIONS: { key: string; title: string; hint: string }[] = [
  { key: "assigned", title: "답사 대기", hint: "현장 입력 필요" },
  { key: "submitted", title: "입력 완료 · 검토 대기", hint: "" },
  { key: "reviewed", title: "검토 완료", hint: "" },
];

function Item({ r }: { r: Row }) {
  const p = r.auction_property;
  return (
    <Link
      href={`/admin/auction/inspect/${r.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card px-3.5 py-3 hover:bg-muted/50 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs font-semibold text-blue-700">{p?.case_number}</div>
        <div className="text-sm line-clamp-1">{p?.address}</div>
        <div className="text-xs text-muted-foreground">
          {[p?.owner_name, r.inspector_name].filter(Boolean).join(" · ")}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

export default async function InspectIndexPage() {
  const rows = await fetchInspections();
  const byStatus = (s: string) => rows.filter((r) => r.status === s);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            답사자 입력
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            배정받은 물건의 현장 답사 결과를 입력합니다. 제출하면 검토 단계로 넘어갑니다.
          </p>
        </div>
        <a
          href="/admin/auction/inspect/inspector-pdf"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-semibold hover:bg-muted"
        >
          답사용 PDF (QR)
        </a>
      </div>

      {SECTIONS.map((sec) => {
        const list = byStatus(sec.key);
        return (
          <section key={sec.key} className="space-y-2">
            <h2 className={cn("text-sm font-black", sec.key === "assigned" && "text-indigo-700")}>
              {sec.title} <span className="text-muted-foreground font-normal">({list.length})</span>
            </h2>
            {list.length === 0 ? (
              <p className="text-xs text-muted-foreground">없음</p>
            ) : (
              <div className="space-y-2">
                {list.map((r) => (
                  <Item key={r.id} r={r} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
