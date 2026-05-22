import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComplaintForm } from "./complaint-form";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/types/database";

export const metadata: Metadata = {
  title: "민원/AS 접수",
  description: "입주민 민원과 AS 접수 폼",
};

async function fetchProperties(): Promise<Pick<Property, "id" | "name">[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("id, name")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    return (data ?? []) as Pick<Property, "id" | "name">[];
  } catch {
    return [];
  }
}

export default async function ComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const { b } = await searchParams;
  const properties = await fetchProperties();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-10">
      <Link href={`/tenant${b ? `?b=${b}` : ""}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 입주민 메인
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">민원/AS 접수</h1>
        <p className="mt-2 text-muted-foreground">
          작성해 주시면 관리자가 확인 후 빠르게 연락드립니다.
        </p>
      </div>

      <Card>
        <CardContent className="pt-8">
          <ComplaintForm properties={properties} defaultPropertyId={b} />
        </CardContent>
      </Card>
    </div>
  );
}
