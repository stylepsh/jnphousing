import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Icons } from "@/lib/icons";
import { SERVICE_AREAS, getServiceArea } from "@/lib/data/services";
import { CASE_STUDIES } from "@/lib/data/cases";
import { CaseCarousel } from "@/components/shared/CaseCarousel";
import { Phone, MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { buildFaqPageLd, jsonLdSafeStringify } from "@/lib/seo/jsonld";
import { PageHero, SERVICE_TABS } from "@/components/layout/PageHero";

export async function generateStaticParams() {
  return SERVICE_AREAS.map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const svc = getServiceArea(slug);
  if (!svc) return { title: "서비스" };
  const ogParams = new URLSearchParams({ title: svc.title, subtitle: svc.tagline, category: svc.category });
  return {
    title: `${svc.title} — ${svc.tagline}`,
    description: svc.description,
    openGraph: {
      title: `${svc.title} | JNP주택관리`,
      description: svc.description,
      images: [`/api/og?${ogParams.toString()}`],
    },
    alternates: { canonical: `/services/${svc.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const svc = getServiceArea(slug);
  if (!svc) notFound();

  const relatedCases = CASE_STUDIES.filter(c => svc.casesTags.includes(c.category));

  return (
    <main id="main-content" className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafeStringify(buildFaqPageLd(svc.faq.map(f => ({ question: f.q, answer: f.a })))) }}
      />

      <PageHero
        eyebrow={svc.category}
        title={svc.title}
        description={`${svc.tagline}. 접수부터 실행·정산·보고까지 하나의 운영 흐름으로 연결합니다.`}
        tabs={SERVICE_TABS}
        activeHref={`/services/${svc.slug}`}
      />

      <div>
        {/* 설명 */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-6 text-base leading-relaxed text-foreground/85">
            {svc.description}
          </div>
        </section>

        {/* 하이라이트 6개 */}
        <section className="bg-slate-50 py-16 border-y border-border/60">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="heading-section-sm text-center mb-10">
              {svc.title} 핵심 서비스
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {svc.highlights.map((h, idx) => {
                const Icon = Icons[h.icon as keyof typeof Icons] ?? Icons.checklist;
                return (
                  <div key={idx} className="bg-white rounded-xl p-5 border border-border/60 hover:shadow-md transition-all animate-fade-in">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold mb-1">{h.title}</h3>
                    <p className="text-sm text-muted-foreground leading-snug">{h.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 진행 절차 */}
        <section className="py-16 bg-background">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="heading-section-sm text-center mb-10">진행 절차</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {svc.process.map((p) => (
                <div key={p.step} className="bg-white rounded-xl p-5 border border-border/60 hover:shadow-md transition-all">
                  <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-3 text-sm">
                    {p.step}
                  </div>
                  <h3 className="font-bold mb-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 요금 안내 */}
        <section className="bg-slate-50 py-16 border-y border-border/60">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="heading-section-sm mb-2">요금 안내</h2>
            <p className="text-sm text-muted-foreground mb-8">
              아래는 기준 가이드입니다. 자산 규모·관리 범위에 따라 협의로 조정합니다.
            </p>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {svc.pricing.map((p, idx) => (
                  <div key={idx} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold">{p.item}</div>
                      {p.note && <div className="text-xs text-muted-foreground mt-0.5">{p.note}</div>}
                    </div>
                    <div className="font-bold text-primary text-right shrink-0">{p.price}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <p className="mt-4 text-xs text-muted-foreground">
              * 부가세 별도 · 위탁 범위에 따라 협의 가능
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-background">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="heading-section-sm mb-8">자주 묻는 질문</h2>
            <Card>
              <CardContent className="p-0">
                <Accordion type="single" collapsible>
                  {svc.faq.map((f, idx) => (
                    <AccordionItem key={idx} value={`faq-${idx}`} className="px-5">
                      <AccordionTrigger className="text-left">
                        <span className="flex items-start gap-3">
                          <span className="text-primary font-bold shrink-0">Q.</span>
                          <span className="font-semibold">{f.q}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex items-start gap-3 text-foreground/85 leading-relaxed">
                          <span className="text-muted-foreground font-bold shrink-0">A.</span>
                          <span>{f.a}</span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 상담 이해용 비식별 운영 시나리오 */}
        {relatedCases.length > 0 && (
          <section className="bg-slate-50 py-16 border-t border-border/60">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-8 max-w-2xl">
                <p className="text-sm font-bold text-primary">운영 흐름 미리보기</p>
                <h2 className="heading-section-sm mt-2">관련 운영 시나리오</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">특정 고객의 실적을 주장하는 자료가 아니라, 상담 이해를 돕기 위한 비식별 예시입니다.</p>
              </div>
              <CaseCarousel cases={relatedCases} />
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 bg-background">
          <div className="mx-auto max-w-3xl px-6">
            <div className="rounded-2xl bg-primary text-white p-8 md:p-10 text-center">
              <h3 className="text-2xl font-bold mb-3">상황만 들려주셔도 가능한 시나리오를 알려드립니다</h3>
              <p className="text-white/80 mb-6">상담은 무료. 위탁 의무 없음.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-blue-50">
                  <a href={COMPANY.contact.phoneHref}>
                    <Phone className="h-4 w-4 mr-1.5" /> {COMPANY.contact.phone}
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                  <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-1.5" /> 카카오톡 상담
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                  <Link href="/contact">관리문의 폼</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
