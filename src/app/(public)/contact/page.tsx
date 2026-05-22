import type { Metadata } from "next";
import { ContactForm } from "./contact-form";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageCircle, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "관리문의",
  description: "신규 건물 관리 문의. 전문 컨설팅 후 견적을 드립니다.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-primary text-white py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Contact</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">관리문의</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl">
            신규 건물 관리·위탁임대를 검토 중이신가요?<br />
            아래 양식을 작성해 주시면 담당자가 직접 연락드립니다.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-8">
                  <ContactForm />
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">대표 전화</p>
                      <p className="text-base font-bold mt-0.5">02-____-____</p>
                      <p className="text-xs text-muted-foreground mt-1">평일 09:00 ~ 18:00</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">카카오톡 상담</p>
                      <p className="text-base mt-0.5">@JNP주택관리</p>
                      <p className="text-xs text-muted-foreground mt-1">상담 채널로 빠른 문의</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">응답 시간</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        영업일 기준 24시간 이내 연락드립니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">이런 분들께 추천드립니다</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• 신축·구축 건물의 관리회사 교체를 검토 중</li>
                    <li>• 직접 임대 관리에 한계를 느끼는 소유주</li>
                    <li>• 현재 관리에 불만족이신 건물주</li>
                    <li>• 비용 절감과 투명한 회계를 원하는 분</li>
                  </ul>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
