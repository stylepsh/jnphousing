import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DownloadDialog } from "./download-dialog";
import { createClient } from "@/lib/supabase/server";
import type { Download } from "@/types/database";

const CATEGORY_LABEL: Record<string, string> = {
  contract: "계약서",
  guide: "안내문",
  form: "서식",
};

async function fetchDownloads(): Promise<Download[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("downloads")
    .select("*")
    .order("category")
    .order("display_order")
    .limit(500);
  return (data ?? []) as Download[];
}

export default async function DownloadsAdminPage() {
  const downloads = await fetchDownloads();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">서류 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            총 {downloads.length}개. 파일은 Supabase Storage 의 <code className="text-xs bg-muted px-1 py-0.5 rounded">downloads</code> 버킷에 업로드 후 URL 을 등록하세요.
          </p>
        </div>
        <DownloadDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {downloads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">등록된 서류가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">카테고리</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[80px]">버전</TableHead>
                  <TableHead className="w-[100px]">크기</TableHead>
                  <TableHead className="w-[80px]">공개</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downloads.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="outline">{CATEGORY_LABEL[d.category]}</Badge></TableCell>
                    <TableCell>
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                        {d.title}
                      </a>
                      {d.description && <p className="text-xs text-muted-foreground line-clamp-1">{d.description}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{d.version ?? "-"}</TableCell>
                    <TableCell className="text-xs">{d.file_size_kb ? `${d.file_size_kb} KB` : "-"}</TableCell>
                    <TableCell className="text-xs">{d.is_published ? "공개" : "비공개"}</TableCell>
                    <TableCell className="text-right">
                      <DownloadDialog mode="edit" download={d} />
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
