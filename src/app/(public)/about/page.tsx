import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Target, Heart, ShieldCheck, Award, MapPin, FileText, Phone, Home as HomeIcon, TrendingUp, Sparkles, Quote, Navigation, ExternalLink } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { CountUp } from "@/components/shared/CountUp";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "회사소개",
  description: `${COMPANY.brand} (${COMPANY.legalName}) — ${COMPANY.yearsOfExperience}년차 ${COMPANY.serviceArea} 위탁임대 전문기업의 인사말, 핵심 가치, 연혁, 인증.`,
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "신뢰",
    desc: "투명한 회계와 정직한 응대로 건물주와 입주민 모두에게 믿음을 드립니다.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: Target,
    title: "전문성",
    desc: "주택관리·임대관리 경력자가 직접 현장을 운영하며 문제를 해결합니다.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    icon: Heart,
    title: "책임감",
    desc: "민원 한 건도 가볍게 보지 않습니다. 빠르고 끝까지 책임지고 마무리합니다.",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

// 5년 단위로 확대된 연혁
const TIMELINE_DEFAULT = [
  { year: 1999, title: "주택관리업 시작",
    text: "부천 일대에서 빌라·다세대 주택 관리 시작. 1인 사업자로 출발." },
  { year: 2005, title: "오피스텔·상가 확장",
    text: "관리 포트폴리오 확대 — 오피스텔·상가 등 다양한 부동산 자산 운영 경험 축적." },
  { year: 2010, title: "위탁임대관리 본격화",
    text: "임대인 대행 서비스 본격 운영. 임차인 모집·임대료 수납·민원 일괄 처리." },
  { year: 2015, title: "분쟁·HUG 대응 노하우 정립",
    text: "HUG 대위변제·세입자 분쟁 등 위기 자산 정상화 실전 경험 본격 축적." },
  { year: 2020, title: "법무 자문 네트워크 구축",
    text: "변호사·법무사 협력 네트워크 — 임대 분쟁 시 즉시 자문 가능 체계 완성." },
  { year: 2026, title: `${COMPANY.legalName} 사업자 등록`,
    text: `부천세무서 (${COMPANY.legal.registrationNumber}) — 디지털 운영 시스템 도입과 함께 본격 법인화 단계.` },
];

interface MilestoneRow {
  year: number;
  month: number | null;
  title: string;
  description: string | null;
  display_order: number;
}

async function fetchMilestones(): Promise<typeof TIMELINE_DEFAULT> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_milestones")
      .select("year, month, title, description, display_order")
      .eq("is_published", true)
      .order("year", { ascending: true })
      .order("month", { ascending: true, nullsFirst: true })
      .order("display_order", { ascending: true });
    const rows = (data ?? []) as MilestoneRow[];
    if (rows.length === 0) return TIMELINE_DEFAULT;
    return rows.map(r => ({
      year: r.year,
      title: r.title,
      text: r.description ?? "",
    }));
  } catch {
    return TIMELINE_DEFAULT;
  }
}

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

const KAKAO_MAP_QUERY = encodeURIComponent(
  `${COMPANY.branches[0].address} ${COMPANY.branches[0].detail}`
);

export default async function AboutPage() {
  const [timeline, certifications] = await Promise.all([
    fetchMilestones(),
    fetchCertifications(),
  ]);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="bg-gradient-to-br from-primary via-primary to-slate-800 text-white py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-6">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">About Us</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">회사소개</h1>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl leading-relaxed">
            건물의 가치를 지키는 일, 임대인의 자산을 지키는 일.
            <br />
            {COMPANY.legalName}이 {COMPANY.yearsOfExperience}년간 {COMPANY.serviceArea}에서 해온 일입니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 flex items-center gap-2 text-sm border border-white/20">
              <Award className="h-4 w-4 text-blue-300" />
              <span className="font-semibold">{COMPANY.yearsOfExperience}년차</span>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 flex items-center gap-2 text-sm border border-white/20">
              <MapPin className="h-4 w-4 text-blue-300" />
              <span>{COMPANY.serviceArea}</span>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 flex items-center gap-2 text-sm border border-white/20">
              <Building2 className="h-4 w-4 text-blue-300" />
              <span>위탁임대 · 분쟁 대응 전문</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 핵심 통계 ============ */}
      <section className="bg-white border-b border-border/60 py-12 md:py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
            <div className="text-center animate-fade-in">
              <div className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                <CountUp end={COMPANY.stats.operatedBuildings} suffix="+" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">운영 건물</p>
            </div>
            <div className="text-center animate-fade-in">
              <div className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                <CountUp end={COMPANY.stats.managedUnits} suffix="+" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">관리 세대</p>
            </div>
            <div className="text-center animate-fade-in">
              <div className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                <CountUp end={COMPANY.stats.resolvedDisputes} suffix="+" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">해결 분쟁</p>
            </div>
            <div className="text-center animate-fade-in">
              <div className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                <CountUp end={COMPANY.stats.yearsAsTeam} suffix="년" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">운영 경력</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 사업자 정보 ============ */}
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

      {/* ============ 대표 인사말 ============ */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Quote className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">대표 인사말</h2>
          </div>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-7 pb-7">
              <div className="space-y-4 text-base text-foreground/85 leading-relaxed">
                <p>안녕하세요. JNP주택관리를 찾아주셔서 감사합니다.</p>
                <p>
                  저희는 단순히 시설을 유지하는 것을 넘어, 건물 한 채 한 채를 마치 저희 것처럼 생각하고 관리하는 회사를 만들고자 합니다.
                  건물주께는 투명한 운영 보고서를, 입주민께는 빠른 응대와 쾌적한 환경을 약속드립니다.
                </p>
                <p>
                  특히 HUG 대위변제·부실 건물·세입자 분쟁처럼 일반 관리회사가 손대지 않는 위기 상황에서도
                  27년 노하우로 끝까지 동행해 왔습니다.
                </p>
                <p>지역에 뿌리내려 오랫동안 신뢰받는 관리회사가 되겠습니다. 감사합니다.</p>
              </div>
              <div className="mt-6 pt-6 border-t border-border flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {COMPANY.representative.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{COMPANY.representative} 대표</p>
                  <p className="text-xs text-muted-foreground">{COMPANY.legalName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ 핵심 가치 ============ */}
      <section className="bg-primary/5 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">핵심 가치</h2>
            <p className="mt-3 text-muted-foreground">JNP가 모든 결정의 기준으로 삼는 세 가지</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 stagger-children">
            {VALUES.map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all animate-fade-in">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center mb-4 border ${color}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 연혁 (5년 단위 확대) ============ */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">연혁</h2>
            <p className="mt-3 text-muted-foreground">{COMPANY.yearsOfExperience}년의 발자취</p>
          </div>
          <div className="relative">
            {/* 좌측 세로 라인 */}
            <div className="absolute left-[88px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-8">
              {timeline.map((t, idx) => (
                <div key={`${t.year}-${idx}`} className="flex gap-6 items-start animate-fade-in">
                  <div className="w-20 shrink-0 text-right">
                    <div className="text-xl font-bold text-primary tabular-nums">{t.year}</div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[19px] top-2 h-3 w-3 rounded-full bg-primary border-2 border-white shadow-sm" />
                  </div>
                  <div className="flex-1 pb-1 pl-2">
                    <h3 className="font-bold text-base">{t.title}</h3>
                    {t.text && (
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 인증서·자격증 ============ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <Award className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">인증·등록</h2>
            <p className="mt-3 text-muted-foreground">투명한 운영을 위한 법적 등록과 인증</p>
          </div>
          {certifications.length === 0 ? (
            <Card className="border-primary/20">
              <CardContent className="pt-7 pb-7">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                      사업자등록
                    </Badge>
                    <h3 className="text-lg font-bold">{COMPANY.legalName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      부천세무서 / 사업자등록번호 {COMPANY.legal.registrationNumber}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      개업일 {COMPANY.legal.openDate} · {COMPANY.legal.taxType}
                    </p>
                    <a
                      href={`https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2316&cntntsId=7878`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      사업자등록 진위 확인 (국세청) <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {certifications.map((c) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow animate-fade-in">
                  <CardContent className="p-5">
                    {c.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url} alt={c.title} className="w-full aspect-[3/4] object-cover rounded mb-3" />
                    )}
                    <h3 className="font-bold text-sm">{c.title}</h3>
                    {c.issuer && <p className="text-xs text-muted-foreground mt-1">{c.issuer}</p>}
                    {c.issued_date && <p className="text-xs text-muted-foreground">{c.issued_date.slice(0, 10)}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ 사무실 위치 + 길찾기 ============ */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">사무실 위치</h2>
            <p className="mt-3 text-muted-foreground">방문 상담 가능 · 사전 예약 권장</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {COMPANY.branches.map((b) => (
              <Card key={b.label} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-7 pb-7">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">{b.label}</p>
                      <h3 className="mt-1 text-lg font-bold">{b.detail}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{b.address}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={`https://map.kakao.com/?q=${KAKAO_MAP_QUERY}`} target="_blank" rel="noopener noreferrer">
                        <Navigation className="h-3.5 w-3.5 mr-1" /> 카카오맵
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={`https://maps.google.com/?q=${KAKAO_MAP_QUERY}`} target="_blank" rel="noopener noreferrer">
                        <Navigation className="h-3.5 w-3.5 mr-1" /> 구글 지도
                      </a>
                    </Button>
                    <Button asChild size="sm">
                      <a href={COMPANY.contact.phoneHref}>
                        <Phone className="h-3.5 w-3.5 mr-1" /> 전화 예약
                      </a>
                    </Button>
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
