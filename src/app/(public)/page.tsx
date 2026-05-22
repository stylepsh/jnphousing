import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Wrench, Users, ArrowRight, QrCode, CheckCircle2, MessageCircle, FileText, MapPin, Award, Hammer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/company";
import type { Property } from "@/types/database";

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "상가",
};

async function fetchTopProperties(): Promise<Property[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .limit(6);
    return (data ?? []) as Property[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const properties = await fetchTopProperties();

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-slate-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 lg:py-40">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/15">
                <Award className="h-3 w-3 mr-1" />
                {COMPANY.yearsOfExperience}년차 부동산 관리 전문기업
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                신뢰로 관리하는<br />
                <span className="text-blue-300">주거공간</span>, JNP주택관리
              </h1>
              <p className="mt-6 text-lg md:text-xl text-blue-100 max-w-xl leading-relaxed">
                {COMPANY.parts.join(" + ")} 그룹이 운영하는<br className="hidden md:block" />
                {COMPANY.serviceArea} 부동산 관리 전문 서비스
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-blue-50">
                  <Link href="/contact">
                    관리문의하기 <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10">
                  <Link href="/properties">관리현장 보기</Link>
                </Button>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 backdrop-blur overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-32 w-32 text-white/20" />
                </div>
                <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/10 backdrop-blur p-4">
                    <div className="text-2xl font-bold">{COMPANY.yearsOfExperience}년차</div>
                    <div className="text-xs text-blue-200">업력</div>
                  </div>
                  <div className="rounded-xl bg-white/10 backdrop-blur p-4">
                    <div className="text-2xl font-bold">2지점</div>
                    <div className="text-xs text-blue-200">부천 본점·심곡</div>
                  </div>
                  <div className="rounded-xl bg-white/10 backdrop-blur p-4">
                    <div className="text-2xl font-bold">3개시</div>
                    <div className="text-xs text-blue-200">{COMPANY.serviceArea.replace(/ · /g, "·")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 핵심 서비스 ============ */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">우리의 서비스</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              주거 가치를 지키는 세 가지 약속
            </h2>
            <p className="mt-4 text-muted-foreground">
              건물 운영, 임대 관리, 입주민 만족까지. 모든 단계를 책임집니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/60 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>주택관리</CardTitle>
                <CardDescription>건물 시설·청소·보안의 종합 관리</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>전문 인력이 상주하여 건물의 가치를 유지합니다. 시설 점검, 정기 청소, 보안 관리까지 일괄 처리.</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>위탁임대관리</CardTitle>
                <CardDescription>임대인 대신 임차 운영을 책임집니다</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>임대료 수납, 공실 마케팅, 임차인 응대까지. 소유주는 정산서만 받아보시면 됩니다.</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>입주민 서비스</CardTitle>
                <CardDescription>QR로 접수하는 빠른 민원 처리</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>전화 없이 온라인으로 민원·AS 접수. 공지사항과 계약서 등 서류도 즉시 다운로드.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============ QR 안내 (입주민) ============ */}
      <section className="bg-primary/5 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                <QrCode className="h-3 w-3 mr-1" /> QR로 접속한 입주민이라면
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                건물에서 본 QR을<br />스캔하셨나요?
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                입주민 페이지에서 민원·AS를 빠르게 접수하고,
                <br />
                공지사항과 계약 서류를 한 곳에서 확인하세요.
              </p>
            </div>
            <div className="grid gap-3">
              <Button asChild size="lg" className="justify-start h-auto py-5 px-6">
                <Link href="/tenant/complaint" className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">민원/AS 접수</div>
                    <div className="text-xs opacity-80 mt-0.5">전화 없이 간편 온라인 접수</div>
                  </div>
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="justify-start h-auto py-5 px-6 border-primary/30">
                <Link href="/tenant" className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">공지사항·서류 다운로드</div>
                    <div className="text-xs text-muted-foreground mt-0.5">계약서·안내문·서식</div>
                  </div>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 관리현장 ============ */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">관리현장</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
                우리가 관리하는 건물
              </h2>
            </div>
            <Button asChild variant="ghost">
              <Link href="/properties">전체 보기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          {properties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">관리현장 데이터가 곧 등록됩니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <Link key={p.id} href={`/properties/${p.id}`}>
                  <Card className="overflow-hidden border-border/60 hover:shadow-lg transition-all hover:-translate-y-0.5 h-full">
                    <div className="aspect-[16/10] bg-muted relative">
                      {p.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="h-16 w-16 text-muted-foreground/20" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-white/95 text-primary hover:bg-white">
                        {PROPERTY_TYPE_LABEL[p.type] ?? p.type}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      <CardDescription className="line-clamp-1">{p.address}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      총 {p.total_units}세대
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ 부동산 파트너 CTA ============ */}
      <section className="bg-slate-900 text-white py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/15">
            부동산 중개사 파트너십
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            공실매물 정보가 필요하신가요?
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            JNP 관리 건물의 실시간 공실 현황을 부동산 회원께 공개합니다.
            <br />
            가입 신청 후 승인되면 바로 열람 가능합니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600">
              <Link href="/agency/signup">부동산 가입 신청 <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
              <Link href="/agency/login">기존 회원 로그인</Link>
            </Button>
          </div>

          <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            {[
              "실시간 공실 현황",
              "보증금·월세 즉시 확인",
              "이미지·상세 정보 제공",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 그룹 구조 (차별점) ============ */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              그룹 시너지
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              신축·시공·관리, 한 그룹에서 완결
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              {COMPANY.groupName}은 주택관리 회사와 종합건설 회사가
              <br className="hidden sm:block" />
              하나의 그룹으로 협력하는 흔치 않은 구조입니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-8 pb-8">
                <div className="h-14 w-14 rounded-xl bg-primary text-white flex items-center justify-center mb-5">
                  <Building2 className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold">제이앤피 주택관리</h3>
                <p className="text-sm text-primary font-semibold mt-1">건물 운영 · 임대 관리</p>
                <ul className="mt-5 space-y-2 text-sm text-foreground/80">
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> 주택·오피스텔·상가 종합 관리</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> 위탁임대관리 (임대료 수납·정산)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> 부동산 분양·판매</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-amber-300/40 bg-amber-50/50">
              <CardContent className="pt-8 pb-8">
                <div className="h-14 w-14 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-5">
                  <Hammer className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold">이한종합건설</h3>
                <p className="text-sm text-amber-700 font-semibold mt-1">건축 · 시공 · 리모델링</p>
                <ul className="mt-5 space-y-2 text-sm text-foreground/80">
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" /> 건축공사 · 주택건설공사</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" /> 건물건설업</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" /> 대수선·리모델링 즉시 대응</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 rounded-2xl bg-primary/5 border border-primary/15 p-6 sm:p-8 text-center">
            <p className="text-base md:text-lg text-foreground/85 leading-relaxed">
              <strong className="text-primary">건물에서 큰 수선이 필요한 순간</strong>, 외주 업체를 찾아 헤매지 마세요.
              <br className="hidden sm:block" />
              관리회사가 직접 견적을 내고, 그룹 내 건설사가 시공합니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{COMPANY.serviceArea} 전 지역 출동 가능 — {COMPANY.yearsOfExperience}년 노하우</span>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/about">회사소개 더보기 <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
