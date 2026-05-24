import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CertDialog } from "./cert-dialog";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Cert {
  id: string;
  title: string;
  issuer: string | null;
  issued_date: string | null;
  image_url: string | null;
  display_order: number;
  is_published: boolean;
}

async function fetchCerts(): Promise<Cert[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("certifications")
      .select("*")
      .order("display_order", { ascending: true });
    return (data ?? []) as Cert[];
  } catch {
    return [];
  }
}

export default async function AdminCertsPage() {
  const certs = await fetchCerts();
  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">인증서·자격증</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href="/about#certifications" target="_blank" className="underline">회사소개</Link> 페이지 인증 섹션에 표시됩니다 · 총 {certs.length}개
          </p>
        </div>
        <CertDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {certs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground">아직 등록된 인증서가 없습니다.</p>
              <p className="text-xs text-muted-foreground mt-1">사업자등록증·HUG 협력업체 등록증 등을 업로드하세요.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">미리보기</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[140px]">발급기관</TableHead>
                  <TableHead className="w-[120px]">발급일</TableHead>
                  <TableHead className="w-[80px]">상태</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt={c.title} className="w-12 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">이미지<br />없음</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-xs">{c.issuer ?? "-"}</TableCell>
                    <TableCell className="text-xs">{c.issued_date?.slice(0, 10) ?? "-"}</TableCell>
                    <TableCell>
                      {c.is_published ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">공개</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">비공개</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <CertDialog mode="edit" cert={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
        <p className="font-semibold mb-1">📁 이미지 업로드</p>
        <p>
          현재는 이미지 URL 직접 입력 방식입니다. Supabase Storage 의 <code className="px-1 bg-white rounded">contracts</code> 또는 별도 버킷에 업로드 후 public URL 을 붙여넣으세요.
        </p>
      </div>
    </div>
  );
}
