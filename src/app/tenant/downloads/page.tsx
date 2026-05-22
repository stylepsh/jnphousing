import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Download, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { Download as DownloadDoc } from "@/types/database";

export const metadata: Metadata = {
  title: "서류 다운로드",
};

const CATEGORY_LABEL: Record<string, string> = {
  contract: "계약서",
  guide: "안내문",
  form: "서식",
};

async function fetchDownloads(): Promise<DownloadDoc[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("downloads")
      .select("*")
      .eq("is_published", true)
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });
    return (data ?? []) as DownloadDoc[];
  } catch {
    return [];
  }
}

export default async function DownloadsPage() {
  const downloads = await fetchDownloads();

  const grouped = downloads.reduce<Record<string, DownloadDoc[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/tenant" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 입주민 메인
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">서류 다운로드</h1>
        <p className="mt-2 text-muted-foreground">필요한 서류를 카테고리별로 확인하세요.</p>
      </div>

      {downloads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>아직 등록된 서류가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="contract" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contract">계약서</TabsTrigger>
            <TabsTrigger value="guide">안내문</TabsTrigger>
            <TabsTrigger value="form">서식</TabsTrigger>
          </TabsList>
          {(["contract", "guide", "form"] as const).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-6 space-y-3">
              {(grouped[cat] ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {CATEGORY_LABEL[cat]} 카테고리에 등록된 서류가 없습니다.
                </p>
              ) : (
                (grouped[cat] ?? []).map((d) => (
                  <Card key={d.id}>
                    <CardContent className="py-5">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold truncate">{d.title}</h3>
                            {d.version && (
                              <Badge variant="secondary" className="text-xs shrink-0">v{d.version}</Badge>
                            )}
                          </div>
                          {d.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>
                          )}
                          {d.file_size_kb && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatFileSize(d.file_size_kb)}
                            </p>
                          )}
                        </div>
                        <Button asChild size="sm">
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" /> 다운로드
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function formatFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
