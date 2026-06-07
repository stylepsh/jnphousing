import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ExternalLink, ShieldCheck, FileText } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { COMPANY } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "인증·자격증",
  description: `${COMPANY.legalName}의 공식 등록·인증서·협력 자격`,
  openGraph: {
    title: "JNP 인증·자격증",
    description: "공식 등록·인증·협력 자격",
    images: [`/api/og?title=${encodeURIComponent("인증·자격증")}&subtitle=${encodeURIComponent("공식 등록·인증")}`],
  },
  alternates: { canonical: "/certifications" },
};

interface Certification {
  id: string;
  title: string;
  issuer: string | null;
  issued_date: string | null;
  image_url: string | null;
}

async function fetchCertifications(): Promise<Certification[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("certifications")
      .select("id, title, issuer, issued_date, image_url")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    return (data ?? []) as Certification[];
  } catch {
    return [];
  }
}

export default async function CertificationsPage() {
  const certs = await fetchCertifications();

  return (
    <>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Breadcrumbs items={[{ name: "회사소개", href: "/about" }, { name: "인증·자격증" }]} className="text-white/70 mb-5" />
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
            <Award className="h-3.5 w-3.5" /> Certifications
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">인증·자격증</h1>
          <p className="mt-3 text-blue-100">JNP주택관리의 공식 등록·인증·협력 자격 일람.</p>
        </div>
      </section>

      <main id="main-content" className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          {/* 사업자등록 (기본) */}
          <Card className="mb-8 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">사업자등록</Badge>
                  <h2 className="text-lg font-bold">{COMPANY.legalName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    부천세무서 / 사업자등록번호 <strong className="text-foreground">{COMPANY.legal.registrationNumber}</strong>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">사업자 등록 {COMPANY.legal.openDate}년 · 위탁임대 전문</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href="https://teht.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/ab/a/a/UTEABAAA13.xml" target="_blank" rel="noopener noreferrer">
                        홈택스 사업자 진위확인 <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href="https://www.bizinfo.go.kr/" target="_blank" rel="noopener noreferrer">
                        기업정보 조회 <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DB 등록 인증서 */}
          {certs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {certs.map(c => (
                <Card key={c.id} className="animate-fade-in">
                  <CardContent className="p-5">
                    {c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url} alt={c.title} className="w-full aspect-[3/4] object-cover rounded-lg mb-3 border border-border" />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-primary/5 rounded-lg mb-3 flex items-center justify-center border border-border">
                        <ShieldCheck className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <h3 className="font-bold text-sm">{c.title}</h3>
                    {c.issuer && <p className="text-xs text-muted-foreground mt-1">{c.issuer}</p>}
                    {c.issued_date && <p className="text-[11px] text-muted-foreground">{c.issued_date.slice(0, 10)}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  HUG 협력업체 인증서, 부동산 협회 등록증 등 추가 자료는 곧 업로드 예정입니다.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  관리자 패널 → 인증서·자격증 메뉴에서 등록 가능 (BLOCKERS B-103).
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mt-10 rounded-xl bg-slate-50 border border-border/60 p-5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">📋 검증 안내</p>
            <p>
              모든 등록·인증은 발급기관 공식 홈페이지에서 진위확인 가능합니다.
              궁금하신 점은 <Link href="/contact" className="text-primary underline">관리문의</Link> 또는 {COMPANY.contact.phone} 로 연락 주세요.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
