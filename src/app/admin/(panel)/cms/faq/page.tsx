import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FaqDialog } from "./faq-dialog";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface FaqRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
  is_published: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  general:  "일반",
  housing:  "주택관리",
  rental:   "위탁임대",
  dispute:  "분쟁·HUG",
  contract: "계약",
  payment:  "임대료·정산",
};

async function fetchFaqs(): Promise<FaqRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("faq")
      .select("*")
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });
    return (data ?? []) as FaqRow[];
  } catch {
    return [];
  }
}

export default async function AdminCmsFaqPage() {
  const faqs = await fetchFaqs();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">자주 묻는 질문 (FAQ)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            홈페이지 <Link href="/faq" target="_blank" className="underline">/faq</Link> 에 노출됩니다 · 총 {faqs.length}개
          </p>
        </div>
        <FaqDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {faqs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted-foreground mb-2">아직 등록된 FAQ가 없습니다.</p>
              <p className="text-xs text-muted-foreground">
                DB가 비어있을 때는 코드의 기본 10개 FAQ가 자동으로 보여집니다.
                <br />
                여기에 항목을 등록하면 그것이 우선 표시됩니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">카테고리</TableHead>
                  <TableHead>질문</TableHead>
                  <TableHead className="w-[80px]">순서</TableHead>
                  <TableHead className="w-[80px]">상태</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[f.category] ?? f.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium line-clamp-1">{f.question}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{f.answer}</div>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{f.display_order}</TableCell>
                    <TableCell>
                      {f.is_published ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">공개</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">비공개</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <FaqDialog mode="edit" faq={f} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900">
          <p className="font-semibold mb-1">💡 작성 팁</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li>실제 고객이 자주 물어본 질문을 그대로 적으세요.</li>
            <li>답변은 친근하고 명확하게 (구체적 숫자·기간 포함).</li>
            <li>카테고리별로 묶여서 표시됩니다.</li>
            <li>표시 순서가 같으면 카테고리·등록순으로 정렬.</li>
          </ul>
        </div>
        <a
          href="/faq"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs hover:bg-primary/10 transition-colors flex items-start gap-3"
        >
          <ExternalLink className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <p className="font-semibold text-primary mb-1">홈페이지 FAQ 미리보기</p>
            <p className="text-primary/70">새 탭에서 사용자 화면 그대로 확인</p>
          </div>
        </a>
      </div>
    </div>
  );
}
