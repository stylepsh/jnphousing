import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calculator, ClipboardList, FileSignature, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "부동산 서식 다운로드",
  description: "JNP주택관리 부동산 회원 전용 서식·자료실",
};

interface DownloadItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  file_url: string;
  file_size_kb: number | null;
  version: string | null;
  audience?: string;
}

async function requireApprovedAgency() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agency/forms");
  const { data } = await supabase
    .from("agencies")
    .select("status, company_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const row = data as { status?: string; company_name?: string } | null;
  if (!row) redirect("/login?error=unauthorized");
  if (row.status !== "approved") redirect(row.status === "rejected" ? "/agency/rejected" : "/agency/pending");
  return row;
}

async function fetchAgencyForms(): Promise<DownloadItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("downloads")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    const all = (data ?? []) as DownloadItem[];
    // audience 컬럼 적용 — 'agency' 또는 'public' 만. 컬럼 미존재 환경에서는 전체 반환.
    return all.filter(d => !d.audience || d.audience === "agency" || d.audience === "public");
  } catch {
    return [];
  }
}

const PRESET_CATEGORIES = [
  {
    key: "contract",
    label: "계약 서식",
    icon: FileSignature,
    description: "임대차계약서·중개대상물 확인서·특약 양식",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "form",
    label: "산정·체크리스트",
    icon: ClipboardList,
    description: "수수료 산정표·매물 인수인계 체크리스트",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "guide",
    label: "업무 가이드",
    icon: BookOpen,
    description: "JNP 위탁관리 흐름·연락 체계 안내",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
];

function formatFileSize(kb: number | null): string {
  if (!kb) return "";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default async function AgencyFormsPage() {
  const agency = await requireApprovedAgency();
  const items = await fetchAgencyForms();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <Badge variant="secondary">부동산 회원 전용</Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">서식 다운로드</h1>
        <p className="mt-2 text-muted-foreground">
          {agency.company_name} 님께서 사용하실 수 있는 표준 서식·체크리스트·업무 가이드입니다.
        </p>
      </header>

      {/* 빠른 도구 */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">빠른 도구</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-primary/30 bg-primary/5 hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">중개수수료 자동 계산</CardTitle>
                  <CardDescription>보증금·월세 → 예상 수수료 즉시 산출</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/agency/forms/commission-calc">계산기 열기</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-white hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <CardTitle className="text-base">임차인 연결 신청</CardTitle>
                  <CardDescription>맘에 드는 매물 → 임차인 정보 전송</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/agency/vacancies">매물 보러가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 카테고리별 서식 목록 */}
      {PRESET_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const catItems = items.filter(i => i.category === cat.key);
        return (
          <section key={cat.key} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${cat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{cat.label}</h2>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
            </div>

            {catItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    이 카테고리의 자료가 곧 업로드됩니다.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    관리자 패널 → 서류 관리에서 등록할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {catItems.map((d) => (
                  <Card key={d.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="font-semibold">{d.title}</div>
                        {d.version && <Badge variant="outline" className="text-[10px]">v{d.version}</Badge>}
                      </div>
                      {d.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{d.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{formatFileSize(d.file_size_kb)}</span>
                        <Button asChild size="sm" variant="outline">
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5 mr-1" />
                            다운로드
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">📌 안내</p>
        <ul className="text-xs space-y-1 ml-4 list-disc">
          <li>JNP주택관리가 제공하는 표준 양식입니다. 임차인 측 사정에 따라 조항을 조정해 사용하세요.</li>
          <li>자료가 보이지 않는다면 관리자(010-9893-6882)에게 문의해 주세요.</li>
        </ul>
      </div>
    </div>
  );
}
