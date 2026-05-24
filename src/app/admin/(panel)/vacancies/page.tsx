import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VacancyAddDialog } from "./vacancy-add-dialog";
import { VacancyActions } from "./vacancy-actions";
import { createClient } from "@/lib/supabase/server";
import type { Property, Vacancy } from "@/types/database";

function formatMoney(v: number): string {
  if (v === 0) return "-";
  if (v >= 100000000) return `${Math.floor(v / 100000000)}억${v % 100000000 ? ` ${Math.floor((v % 100000000) / 10000)}만` : ""}`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return v.toLocaleString();
}

async function fetchData() {
  const supabase = await createClient();
  const [vRes, pRes] = await Promise.all([
    supabase.from("vacancies").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("properties").select("id, name, address").order("name"),
  ]);
  return {
    vacancies: (vRes.data ?? []) as Vacancy[],
    properties: (pRes.data ?? []) as Pick<Property, "id" | "name" | "address">[],
  };
}

export default async function VacanciesAdminPage() {
  const { vacancies, properties } = await fetchData();
  const propMap = new Map(properties.map((p) => [p.id, p]));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">공실 매물 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {vacancies.length}건의 매물.</p>
        </div>
        <VacancyAddDialog properties={properties} />
      </div>

      <Card>
        <CardContent className="p-0">
          {vacancies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">등록된 매물이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>건물·호수</TableHead>
                  <TableHead className="w-[80px]">평형</TableHead>
                  <TableHead>보증금/월세</TableHead>
                  <TableHead className="w-[80px]">상태</TableHead>
                  <TableHead className="w-[80px]">공개</TableHead>
                  <TableHead className="text-right w-[110px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacancies.map((v) => {
                  const p = propMap.get(v.property_id);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">
                        <Link href={`/admin/vacancies/${v.id}`} className="hover:underline">
                          <div className="font-medium">{p?.name ?? "-"} · {v.unit_number}호</div>
                          <div className="text-xs text-muted-foreground">{p?.address}</div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{v.area_pyeong ? `${v.area_pyeong}평` : "-"}</TableCell>
                      <TableCell className="text-sm">
                        <div>{formatMoney(v.deposit)} / {formatMoney(v.monthly_rent)}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <VacancyActions vacancyId={v.id} currentStatus={v.status} variant="status-only" />
                      </TableCell>
                      <TableCell className="text-xs">{v.is_published ? "공개" : "비공개"}</TableCell>
                      <TableCell className="text-right">
                        <VacancyActions vacancyId={v.id} currentStatus={v.status} variant="actions-only" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
