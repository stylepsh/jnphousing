import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/company";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FAQPageJsonLd } from "@/components/shared/JsonLd";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description: "JNP주택관리 위탁임대·주택관리 관련 FAQ",
};

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  general:  "일반",
  housing:  "주택관리",
  rental:   "위탁임대",
  dispute:  "분쟁·HUG",
  contract: "계약",
  payment:  "임대료·정산",
};

// 기본 FAQ (DB 비어있을 때 fallback)
const DEFAULT_FAQ: FaqItem[] = [
  { id: "d1", category: "general", display_order: 1,
    question: "JNP주택관리는 어떤 회사인가요?",
    answer: `${COMPANY.legalName}은 부천 본점 기반의 위탁임대관리 전문회사로, 27년차 실전 노하우를 바탕으로 HUG 대위변제·부실 건물·세입자 분쟁까지 처리합니다.\n사업자등록번호: ${COMPANY.legal.registrationNumber}` },
  { id: "d2", category: "general", display_order: 2,
    question: "주택관리와 위탁임대관리의 차이가 뭔가요?",
    answer: "주택관리는 시설·청소·보안 등 건물 운영 자체를 책임지는 서비스입니다. 위탁임대관리는 임차인 모집·임대료 수금·정산·민원 대응까지 임대인의 거의 모든 역할을 대행합니다." },
  { id: "d3", category: "rental", display_order: 1,
    question: "위탁임대 수수료는 어떻게 책정되나요?",
    answer: "건물 상태·세대수·위탁 범위에 따라 다릅니다. 통상 월 임대료의 일정 비율 또는 정액제로 운영하며, 상담 시 정확한 견적을 제시합니다." },
  { id: "d4", category: "rental", display_order: 2,
    question: "위탁관리 계약 기간은 얼마인가요?",
    answer: "기본 1년 단위이며, 양 당사자 협의로 연장합니다. 중도 해지 조항은 계약서에 명시합니다." },
  { id: "d5", category: "dispute", display_order: 1,
    question: "HUG 대위변제가 발생했는데 도움을 받을 수 있나요?",
    answer: "네. HUG 대위변제 통보를 받은 임대인을 위한 후속 절차 동행 전문 서비스를 운영합니다. 자산 정리·임차인 정리·법적 절차까지 27년 경험으로 함께합니다. 010-7508-6916 로 연락 주세요." },
  { id: "d6", category: "dispute", display_order: 2,
    question: "세입자와 분쟁이 있는데 중재가 가능한가요?",
    answer: "현장 중재·법무 자문 연결까지 동행합니다. 변호사 비용 부담을 줄일 수 있도록 자문 네트워크를 활용합니다." },
  { id: "d7", category: "housing", display_order: 1,
    question: "부실 건물도 정상화가 가능한가요?",
    answer: "수익이 안 나오는 빈 건물이나 반쪽 건물도 단계적 수선과 임차인 매칭으로 정상화한 사례가 많습니다. 사례별 진단 후 가능한 시나리오를 알려드립니다." },
  { id: "d8", category: "contract", display_order: 1,
    question: "임차인 입장에서 어떻게 계약이 진행되나요?",
    answer: "JNP가 위탁관리하는 건물의 경우, 임차인은 부동산 회원사를 통해 매물을 보고 → 임대인 또는 JNP와 직접 계약을 체결합니다. 계약 후 임대료 수금·민원·AS 등은 JNP가 응대합니다." },
  { id: "d9", category: "payment", display_order: 1,
    question: "임대료는 어떻게 납부하나요?",
    answer: "임차인은 지정 계좌로 매월 정해진 일자에 이체합니다. 미납 시 자동 안내가 발송되며, 영수증·납부 내역은 임차인 페이지에서 다운로드할 수 있습니다." },
  { id: "d10", category: "payment", display_order: 2,
    question: "임대인은 정산 보고서를 받을 수 있나요?",
    answer: "네. 매월 자동 정산 보고서(PDF)가 생성되며, 임대인 포털에서 언제든 다운로드할 수 있습니다. 카톡 알림 발송도 가능합니다." },
];

async function fetchFaq(): Promise<FaqItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("faq")
      .select("id, category, question, answer, display_order")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("category", { ascending: true });
    if (error || !data || data.length === 0) return DEFAULT_FAQ;
    return data as FaqItem[];
  } catch {
    return DEFAULT_FAQ;
  }
}

export default async function FaqPage() {
  const items = await fetchFaq();

  // 카테고리별 그룹핑
  const grouped = items.reduce<Record<string, FaqItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  return (
    <>
      <FAQPageJsonLd items={items.map(i => ({ question: i.question, answer: i.answer }))} />
      <section className="bg-gradient-to-br from-primary via-primary to-slate-800 text-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
            <HelpCircle className="h-3.5 w-3.5" /> FAQ
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            자주 묻는 질문
          </h1>
          <p className="mt-3 text-blue-100 max-w-2xl">
            위탁임대·주택관리·HUG 대응에 대해 가장 많이 받는 질문들입니다.
            더 궁금한 점은 카톡 또는 전화로 문의해 주세요.
          </p>
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-10">
            {Object.entries(grouped).map(([cat, qs]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    {CATEGORY_LABEL[cat] ?? cat}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{qs.length}개 질문</span>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {qs.map((q) => (
                        <AccordionItem key={q.id} value={q.id} className="px-5">
                          <AccordionTrigger className="text-left font-semibold">
                            <span className="flex items-start gap-3">
                              <span className="text-primary font-bold shrink-0">Q.</span>
                              <span>{q.question}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex items-start gap-3 pb-1 text-foreground/85 leading-relaxed whitespace-pre-wrap">
                              <span className="text-muted-foreground font-bold shrink-0">A.</span>
                              <span>{q.answer}</span>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-6 md:p-8 text-center">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 text-primary" />
            <h3 className="text-xl font-bold tracking-tight">원하는 답이 없으신가요?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              상황을 들려주시면 가능한 시나리오를 직접 안내드립니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/contact">관리문의 보내기</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer">
                  카카오 채팅으로 묻기
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
