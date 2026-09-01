import type { Metadata } from "next";
import { ContactForm } from "./contact-form";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageCircle, Clock } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "관리문의",
  description: "신규 건물 관리 문의. 전문 컨설팅 후 견적을 드립니다.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-primary text-white py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-blue-200 text-sm font-semibold">무료 상담</p>
          <h1 className="mt-2 heading-section">힘든 상황, 혼자 고민하지 마세요</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl">
            전화 한 통이면 시작됩니다. 상담 의무 없이, 무료로 상황을 들어드립니다.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-8">
                  {/* 간편 연락 옵션 */}
                  <div className="mb-8 p-5 rounded-xl bg-primary/5 border border-primary/15">
                    <p className="text-sm font-semibold mb-3">양식 작성이 번거로우시다면:</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a href={COMPANY.contact.phoneHref} className="flex items-center justify-center gap-2 bg-primary text-white rounded-lg h-11 px-5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                        <Phone className="h-4 w-4" /> 전화로 바로 상담하기
                      </a>
                      <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#FEE500] text-[#3C1E1E] rounded-lg h-11 px-5 text-sm font-semibold hover:bg-[#FDD800] transition-colors">
                        <MessageCircle className="h-4 w-4" /> 카카오톡 상담하기
                      </a>
                    </div>
                  </div>
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
                      <p className="text-sm font-semibold">{COMPANY.contact.phoneLabel}</p>
                      <a href={COMPANY.contact.phoneHref} className="text-lg font-bold mt-0.5 text-primary block hover:underline">
                        {COMPANY.contact.phone}
                      </a>
                      <p className="text-xs text-muted-foreground mt-1">평일 09:00 ~ 18:00 · 대표 {COMPANY.representative}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">카카오톡 상담</p>
                      <a href={COMPANY.contact.kakaoOpenChat} target="_blank" rel="noopener noreferrer" className="text-sm mt-0.5 text-primary hover:underline">
                        오픈채팅으로 바로가기
                      </a>
                      <p className="text-xs text-muted-foreground mt-1">민원·제휴·신규 문의 통합 상담방</p>
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
                  <h3 className="font-semibold mb-3">이런 분들께 꼭 필요합니다</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• HUG 대위변제 통보를 받으셨나요? 당황하지 마세요.</li>
                    <li>• 빈 건물의 공실 원인과 운영 가능성을 점검하고 싶으신가요?</li>
                    <li>• 세입자 문제로 잠을 못 주무시나요? 저희가 중재합니다.</li>
                    <li>• 가족 생활비가 건물에 묶여 있나요? 현금 흐름을 만들어드립니다.</li>
                    <li>• 법적 검토가 필요한 사안의 대응 절차가 막막하신가요?</li>
                    <li>• 기존 관리회사가 불만족스러우신가요? 비교 견적을 드립니다.</li>
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
