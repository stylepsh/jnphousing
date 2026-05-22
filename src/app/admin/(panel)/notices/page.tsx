import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NoticeDialog } from "./notice-dialog";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Notice, Property } from "@/types/database";

async function fetchData() {
  const supabase = await createClient();
  const [nRes, pRes] = await Promise.all([
    supabase.from("notices").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("properties").select("id, name").order("name"),
  ]);
  return {
    notices: (nRes.data ?? []) as Notice[],
    properties: (pRes.data ?? []) as Pick<Property, "id" | "name">[],
  };
}

export default async function NoticesAdminPage() {
  const { notices, properties } = await fetchData();
  const propMap = new Map(properties.map((p) => [p.id, p.name]));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">공지사항</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {notices.length}개</p>
        </div>
        <NoticeDialog mode="create" properties={properties} />
      </div>

      <Card>
        <CardContent className="p-0">
          {notices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">등록된 공지가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">대상</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[80px]">고정</TableHead>
                  <TableHead className="w-[80px]">공개</TableHead>
                  <TableHead className="w-[100px]">등록일</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-xs">
                      {n.property_id ? propMap.get(n.property_id) ?? "—" : <Badge variant="outline">전체</Badge>}
                    </TableCell>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell className="text-xs">{n.is_pinned ? "📌 고정" : "-"}</TableCell>
                    <TableCell className="text-xs">{n.is_published ? "공개" : "비공개"}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(n.created_at), "MM.dd", { locale: ko })}
                    </TableCell>
                    <TableCell className="text-right">
                      <NoticeDialog mode="edit" notice={n} properties={properties} />
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
