import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, CalendarCheck2, CheckCircle2, Home, MapPin, ShieldCheck } from "lucide-react";
import { fetchPublicPropertyGroup } from "@/lib/public-properties-server";

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "복합시설",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const property = await fetchPublicPropertyGroup(id);
  if (!property) return { title: "관리현장" };
  return {
    title: property.name,
    description: `${property.name} · ${property.totalUnits}세대 규모의 비식별 운영 포트폴리오`,
    alternates: { canonical: `/properties/${property.id}` },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await fetchPublicPropertyGroup(id);
  if (!property) notFound();
  const typeLabel = PROPERTY_TYPE_LABEL[property.type] ?? property.type;

  return (
    <main id="main-content" className="bg-white">
      <section className="relative isolate min-h-[520px] overflow-hidden bg-[#101D34] text-white">
        <Image src={property.imagePath} alt={`${property.name} 공개용 가상 건물 이미지`} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081426]/95 via-[#101D34]/72 to-[#101D34]/15" />
        <div className="relative mx-auto flex min-h-[520px] max-w-6xl items-end px-6 py-12 sm:py-16">
          <div className="max-w-2xl animate-slide-up">
            <Link href="/properties" className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> 관리현장 목록</Link>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-bold backdrop-blur">{typeLabel}</span>
              <span className="rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-xs font-bold text-blue-100 backdrop-blur">비식별 공개 예시</span>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{property.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-slate-200"><MapPin className="h-4 w-4" /> {property.address}</p>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">{property.summary}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5EAF1] bg-[#F7F9FC]">
        <div className="mx-auto grid max-w-6xl divide-y divide-[#DDE3EC] px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { icon: Home, label: "구성 규모", value: `${property.totalUnits.toLocaleString("ko-KR")}세대` },
            { icon: Building2, label: "건물 유형", value: typeLabel },
            { icon: CalendarCheck2, label: "운영 체계", value: "월간 보고" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 py-6 sm:px-7 first:sm:pl-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Icon className="h-5 w-5" /></span>
              <div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 font-bold text-[#16233A]">{value}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-22">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-sm font-bold text-blue-600">MANAGEMENT SCOPE</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#16233A]">현장의 문제를<br />하나의 운영표로 묶습니다.</h2>
            <p className="mt-5 leading-7 text-slate-600">담당자가 달라져도 접수부터 완료 보고까지 같은 기준으로 기록합니다. 건물주는 결과와 비용을 한눈에 확인할 수 있습니다.</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {(property.focus ?? ["현장 점검", "운영 관리", "월간 보고"]).map((item, index) => (
              <li key={item} className="rounded-2xl border border-[#DDE3EC] bg-white p-6 shadow-sm">
                <span className="text-xs font-bold tracking-[0.15em] text-blue-500">0{index + 1}</span>
                <CheckCircle2 className="mt-8 h-6 w-6 text-emerald-500" />
                <h3 className="mt-4 text-lg font-bold text-[#16233A]">{item}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">접수·담당·진행·완료 상태를 기록하고 필요한 내용을 공유합니다.</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#F5F7FA] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-[#DDE3EC] bg-white p-7 shadow-sm sm:p-9 lg:flex-row lg:items-center">
            <div className="flex max-w-2xl items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck className="h-6 w-6" /></span>
              <div><h2 className="text-xl font-bold text-[#16233A]">공개용 가상 포트폴리오입니다.</h2><p className="mt-2 text-sm leading-6 text-slate-600">계약 당사자와 입주민 보호를 위해 실제 건물명·상세 주소·이미지는 사용하지 않았습니다. 운영 유형과 규모를 이해하기 위한 비식별 예시입니다.</p></div>
            </div>
            <Link href="/contact" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#16233A] px-5 font-bold text-white transition hover:bg-blue-700">내 건물 진단받기 <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
