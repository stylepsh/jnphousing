import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail, Award, Users, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { STAFF } from "@/lib/data/staff";

export const metadata: Metadata = {
  title: "팀 소개 — 운영팀",
  description: "JNP주택관리 대표 박재흥과 분야별 협력 네트워크.",
  openGraph: {
    title: "JNP 팀 소개",
    description: "운영팀",
    images: [`/api/og?title=${encodeURIComponent("팀 소개")}&subtitle=${encodeURIComponent("운영팀")}`],
  },
  alternates: { canonical: "/team" },
};

export default function TeamPage() {
  return (
    <>
      <section className="bg-primary text-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Breadcrumbs
            items={[{ name: "회사소개", href: "/about" }, { name: "팀 소개" }]}
            className="text-white/70 mb-5"
          />
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
            <Users className="h-3.5 w-3.5" /> Our Team
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">팀 소개</h1>
          <p className="mt-3 text-blue-100">
            JNP주택관리를 움직이는 사람들.
            오랜 운영 경력 + 분야별 협력 네트워크가 위기 자산을 정상화합니다.
          </p>
        </div>
      </section>

      <main id="main-content" className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid md:grid-cols-2 gap-6 stagger-children">
            {STAFF.map((m) => (
              <Card key={m.id} className="overflow-hidden animate-fade-in">
                <div
                  className="aspect-[3/2] relative"
                  style={{ background: `linear-gradient(135deg, hsl(${m.hue}, 65%, 35%) 0%, hsl(${m.hue}, 55%, 22%) 100%)` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center text-white text-3xl font-bold">
                      {m.initials}
                    </div>
                  </div>
                  <Badge className="absolute top-3 left-3 bg-white/95 text-primary hover:bg-white">
                    <Award className="h-3 w-3 mr-1" /> {m.experienceYears}년 경력
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h2 className="text-xl font-bold">{m.name}</h2>
                    <span className="text-sm text-muted-foreground">{m.role}</span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed mb-4">{m.introduction}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {m.expertise.map(e => (
                      <span key={e} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
                        {e}
                      </span>
                    ))}
                  </div>
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="inline-flex items-center text-sm text-primary font-medium hover:underline">
                      <Mail className="h-3.5 w-3.5 mr-1" /> {m.email}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-slate-50 border border-border/60 p-6 md:p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              JNP는 사례마다 필요한 협력업체(변호사·시설·청소·보안·중개사)를 직접 연결합니다.
              <br />
              한 회사를 부르는 것 = 통합 솔루션 받는 것.
            </p>
            <Button asChild>
              <Link href="/contact">관리문의 보내기 <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
