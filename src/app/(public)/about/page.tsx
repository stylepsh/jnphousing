import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Target, Heart, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "회사소개",
  description: "JNP주택관리의 인사말, 연혁, 핵심 가치를 소개합니다.",
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
  { year: "2024", text: "JNP주택관리 설립" },
  { year: "2025", text: "위탁임대관리 서비스 본격 개시" },
  { year: "2026", text: "관리현장 ___ 건물 / 200세대 돌파" },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-primary text-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">About Us</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">회사소개</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl leading-relaxed">
            건물의 가치를 지키는 일, 입주민의 일상을 지키는 일.
            JNP주택관리는 두 가지를 동시에 잘 해내기 위해 만들어진 회사입니다.
          </p>
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

      {/* 조직 */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">조직 구성</h2>
            <p className="mt-3 text-muted-foreground">현장 운영부터 회계까지, 전문 인력으로 구성</p>
          </div>
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">조직도 이미지는 추후 등록됩니다.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
