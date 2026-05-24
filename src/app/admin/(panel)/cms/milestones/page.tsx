import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MilestoneDialog } from "./milestone-dialog";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Milestone {
  id: string;
  year: number;
  month: number | null;
  title: string;
  description: string | null;
  display_order: number;
  is_published: boolean;
}

async function fetchMilestones(): Promise<Milestone[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_milestones")
      .select("*")
      .order("year", { ascending: true })
      .order("month", { ascending: true, nullsFirst: true });
    return (data ?? []) as Milestone[];
  } catch {
    return [];
  }
}

export default async function AdminMilestonesPage() {
  const items = await fetchMilestones();
  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">회사 연혁</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href="/about" target="_blank" className="underline">회사소개</Link> 페이지 연혁 섹션에 표시됩니다 · 총 {items.length}개
          </p>
        </div>
        <MilestoneDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground mb-1">아직 등록된 연혁이 없습니다.</p>
              <p className="text-xs text-muted-foreground">DB가 비어있을 때는 코드의 기본 6개 연혁이 자동으로 보여집니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">연도</TableHead>
                  <TableHead className="w-[60px]">월</TableHead>
                  <TableHead>제목·설명</TableHead>
                  <TableHead className="w-[80px]">순서</TableHead>
                  <TableHead className="w-[80px]">상태</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-bold tabular-nums">{m.year}</TableCell>
                    <TableCell className="text-xs">{m.month ?? "-"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{m.title}</div>
                      {m.description && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{m.description}</div>}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{m.display_order}</TableCell>
                    <TableCell>
                      {m.is_published ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">공개</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">비공개</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <MilestoneDialog mode="edit" milestone={m} />
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
