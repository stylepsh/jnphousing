import type { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Wrench, BadgeCheck, CheckCircle2, Sparkles, ShieldCheck, ClipboardCheck, Receipt, Users, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "서비스",
  description: "주택관리, 위탁임대관리 — JNP의 두 가지 핵심 서비스를 소개합니다.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="bg-primary text-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Our Services</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">서비스</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl leading-relaxed">
            JNP주택관리는 두 가지 축으로 운영됩니다. 건물 운영의 모든 단계를 한 회사가 책임집니다.
          </p>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Tabs defaultValue="housing" className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-2">
              <TabsTrigger value="housing">주택관리</TabsTrigger>
              <TabsTrigger value="rental">위탁임대관리</TabsTrigger>
            </TabsList>

            {/* 주택관리 */}
            <TabsContent value="housing" className="mt-10 space-y-12">
              <div className="grid lg:grid-cols-2 gap-10 items-start">
                <div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">주택관리</h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    건물 시설을 안정적으로 유지하고, 입주민이 쾌적하게 거주할 수 있도록 책임집니다.
                    소규모 오피스텔·빌라부터 중규모 아파트까지 맞춤 운영합니다.
                  </p>
                </div>
                <Card className="border-border/60 bg-primary/5">
                  <CardContent className="pt-6 space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>월 정액 관리비로 예측 가능한 비용</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>전담 매니저가 직접 응대</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>월간 보고서 및 회계 투명 공개</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>긴급 대응 24시간 핫라인</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 서비스 범위 */}
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-6">서비스 범위</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: ClipboardCheck, title: "정기 시설 점검", desc: "전기·수도·소방 등 주요 시설 정기 점검" },
                    { icon: Sparkles, title: "공용부 청소", desc: "복도·계단·주차장 정기 청소 및 위생 관리" },
                    { icon: ShieldCheck, title: "보안 관리", desc: "CCTV 운영, 출입 통제, 야간 순찰" },
                    { icon: Wrench, title: "AS·소액 수선", desc: "사소한 수선은 즉시 처리, 대수선은 견적 후 진행" },
                    { icon: Users, title: "민원 응대", desc: "입주민 민원 접수와 처리 결과 회신" },
                    { icon: Receipt, title: "관리비 회계", desc: "매월 정산 보고서 발행, 투명한 회계" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <Card key={title} className="border-border/60">
                      <CardContent className="pt-6">
                        <Icon className="h-7 w-7 text-primary mb-3" />
                        <h4 className="font-semibold">{title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 프로세스 */}
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-6">진행 절차</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    "관리문의 접수",
                    "현장 실사·견적",
                    "계약 체결",
                    "관리 개시",
                  ].map((step, i) => (
                    <div key={step} className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-3">
                        {i + 1}
                      </div>
                      <p className="font-semibold">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 위탁임대관리 */}
            <TabsContent value="rental" className="mt-10 space-y-12">
              <div className="grid lg:grid-cols-2 gap-10 items-start">
                <div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">위탁임대관리</h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    소유주를 대신해 임대 운영의 모든 과정을 책임집니다.
                    공실 마케팅, 임차인 응대, 임대료 수납과 정산까지 한 번에.
                  </p>
                </div>
                <Card className="border-border/60 bg-primary/5">
                  <CardContent className="pt-6 space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>임대료 입금 정확성 보장</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>공실 발생 시 빠른 임차인 매칭</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>월간 임대 운영 보고서 제공</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>임차인 민원·트러블 직접 대응</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-6">서비스 범위</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: KeyRound, title: "공실 마케팅", desc: "협력 부동산 네트워크에 즉시 매물 공개" },
                    { icon: ClipboardCheck, title: "임차인 응대", desc: "입주 안내, 계약 갱신, 민원 처리" },
                    { icon: Receipt, title: "임대료 수납", desc: "정기 수납, 미납 시 안내 및 대응" },
                    { icon: ShieldCheck, title: "퇴거·재계약", desc: "퇴거 정산, 원상복구, 재계약 협의" },
                    { icon: Wrench, title: "시설 유지보수", desc: "임대 기간 중 시설 관리 일괄" },
                    { icon: CheckCircle2, title: "월간 정산 보고", desc: "소유주에게 매월 임대 수익 정산서 발행" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <Card key={title} className="border-border/60">
                      <CardContent className="pt-6">
                        <Icon className="h-7 w-7 text-primary mb-3" />
                        <h4 className="font-semibold">{title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-6">진행 절차</h3>
                <div className="grid gap-4 md:grid-cols-5">
                  {[
                    "위탁 문의 접수",
                    "현장 실사",
                    "위탁 계약",
                    "공실 마케팅·임차인 매칭",
                    "운영 개시·월간 정산",
                  ].map((step, i) => (
                    <div key={step} className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-3">
                        {i + 1}
                      </div>
                      <p className="font-semibold text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </>
  );
}
