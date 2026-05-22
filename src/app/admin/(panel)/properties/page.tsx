import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PropertyDialog } from "./property-dialog";
import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/types/database";

const TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "상가",
};

async function fetchProperties(): Promise<Property[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as Property[];
}

export default async function PropertiesAdminPage() {
  const properties = await fetchProperties();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">관리현장</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {properties.length}개 등록됨</p>
        </div>
        <PropertyDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">등록된 관리현장이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">순서</TableHead>
                  <TableHead>건물명</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead className="w-[80px]">유형</TableHead>
                  <TableHead className="w-[80px]">세대수</TableHead>
                  <TableHead className="w-[80px]">공개</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm tabular-nums">{p.display_order}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.address}</TableCell>
                    <TableCell><Badge variant="outline">{TYPE_LABEL[p.type] ?? p.type}</Badge></TableCell>
                    <TableCell className="text-sm">{p.total_units}</TableCell>
                    <TableCell className="text-xs">{p.is_published ? "공개" : "비공개"}</TableCell>
                    <TableCell className="text-right">
                      <PropertyDialog mode="edit" property={p} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
