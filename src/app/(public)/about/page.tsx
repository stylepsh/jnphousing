import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Target, Heart, ShieldCheck, Award, MapPin, FileText, Phone } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "회사소개",
  description: `${COMPANY.brand} (${COMPANY.legalName}) — ${COMPANY.yearsOfExperience}년차 ${COMPANY.serviceArea} 위탁임대 전문기업의 인사말과 핵심 가치.`,
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "신뢰",
    desc: "투명한 회계와 정직한 응대로 건물주와 입주민 모두에게 믿음을 드립니다.",
  },
  {
    icon: Target,
    title: "전문성",
    desc: "주택관리·임대관리 경력자가 직접 현장을 운영하며 문제를 해결합니다.",
  },
  {
    icon: Heart,
    title: "책임감",
    desc: "민원 한 건도 가볍게 보지 않습니다. 빠르고 끝까지 책임지고 마무리합니다.",
  },
];

const TIMELINE = [
  { year: "1999", text: "부동산 관리업 시작 — 부천 일대 주택관리" },
  { year: "2010s", text: "위탁임대관리 본격 확장 — HUG 대위변제·부실 건물 정상화 케이스 축적" },
  { year: "2020", text: "분쟁·법무 자문 네트워크 구축" },
  { year: "2026", text: `${COMPANY.legalName} 사업자 등록 (부천세무서) — ${COMPANY.legal.registrationNumber}` },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-primary text-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">About Us</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">회사소개</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl leading-relaxed">
            건물의 가치를 지키는 일, 임대인의 자산을 지키는 일.
            <br />
            {COMPANY.legalName}이 {COMPANY.yearsOfExperience}년간 {COMPANY.serviceArea}에서 해온 일입니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-blue-300" />
              <span className="font-semibold">{COMPANY.yearsOfExperience}년차</span>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-blue-300" />
              <span>{COMPANY.serviceArea}</span>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-blue-300" />
              <span>위탁임대 · 분쟁 대응 전문</span>
            </div>
          </div>
        </div>
      </section>

      {/* 사업자 정보 */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">Business Info</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">사업자 정보</h2>
          </div>
          <Card className="border-primary/20">
            <CardContent className="pt-7 pb-7">
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <InfoRow icon={Building2} label="상호" value={COMPANY.legalName} />
                <InfoRow icon={Award} label="대표" value={COMPANY.representative} />
                <InfoRow icon={FileText} label="사업자등록번호" value={COMPANY.legal.registrationNumber} />
                <InfoRow icon={ShieldCheck} label="과세 유형" value={COMPANY.legal.taxType} />
                <InfoRow icon={Target} label="업태 / 종목" value={`${COMPANY.business.category} / ${COMPANY.business.item}`} />
                <InfoRow icon={Phone} label={COMPANY.contact.phoneLabel} value={COMPANY.contact.phone} />
                <div className="sm:col-span-2">
                  <InfoRow icon={MapPin} label="본점" value={`${COMPANY.branches[0].address}, ${COMPANY.branches[0].detail}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 인사말 */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">대표 인사말</h2>
          <div className="space-y-4 text-base text-foreground/80 leading-relaxed">
            <p>
              안녕하세요. JNP주택관리를 찾아주셔서 감사합니다.
            </p>
            <p>
              저희는 단순히 시설을 유지하는 것을 넘어, 건물 한 채 한 채를 마치
              저희 것처럼 생각하고 관리하는 회사를 만들고자 합니다. 건물주께는
              투명한 운영 보고서를, 입주민께는 빠른 응대와 쾌적한 환경을
              약속드립니다.
            </p>
            <p>
              지역에 뿌리내려 오랫동안 신뢰받는 관리회사가 되겠습니다. 감사합니다.
            </p>
            <p className="pt-2 text-sm text-muted-foreground">JNP주택관리 대표</p>
          </div>
        </div>
      </section>

      {/* 핵심 가치 */}
      <section className="bg-primary/5 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">핵심 가치</h2>
            <p className="mt-3 text-muted-foreground">JNP가 모든 결정의 기준으로 삼는 세 가지</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-border/60">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 연혁 */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">연혁</h2>
          <div className="space-y-6">
            {TIMELINE.map((t) => (
              <div key={t.year} className="flex gap-6 items-start">
                <div className="text-2xl font-bold text-primary tabular-nums w-20 shrink-0">{t.year}</div>
                <div className="flex-1 pt-1.5 border-l border-border pl-6 pb-6 -ml-2">
                  <p className="text-base text-foreground/90">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 사무실 위치 */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">사무실 위치</h2>
            <p className="mt-3 text-muted-foreground">방문 상담 가능 · 사전 예약 권장</p>
          </div>
          <div className="grid gap-5">
            {COMPANY.branches.map((b) => (
              <Card key={b.label}>
                <CardContent className="pt-7 pb-7">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">{b.label}</p>
                      <h3 className="mt-1 text-lg font-bold">{b.detail}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{b.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
