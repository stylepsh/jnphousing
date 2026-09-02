import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, MapPin, Search, ShieldCheck } from "lucide-react";
import { fetchPublicPropertyGroups } from "@/lib/public-properties-server";
import { PUBLIC_SHOWCASE_TOTAL_UNITS } from "@/lib/data/public-showcase";

export const metadata: Metadata = {
  title: "관리현장",
  description: "JNP주택관리의 운영 범위와 현장 규모를 비식별 재구성한 공개 포트폴리오입니다.",
  alternates: { canonical: "/properties" },
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  officetel: "오피스텔",
  apartment: "아파트",
  villa: "빌라",
  commercial: "복합시설",
};

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const sp = await searchParams;
  const allProperties = await fetchPublicPropertyGroups();
  const query = (sp.q ?? "").trim().toLocaleLowerCase("ko-KR");
  const properties = allProperties.filter((property) => {
    const typeMatches = !sp.type || sp.type === "all" || property.type === sp.type;
    const queryMatches = !query || `${property.name} ${property.address} ${property.region}`.toLocaleLowerCase("ko-KR").includes(query);
    return typeMatches && queryMatches;
  });

  return (
    <main id="main-content" className="bg-white">
      <section className="relative isolate overflow-hidden bg-[#101D34] text-white">
        <div className="jnp-grid absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="jnp-orb absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 md:py-22 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div className="animate-fade-in">
            <p className="text-sm font-bold tracking-[0.16em] text-blue-300">MANAGED PORTFOLIO</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.12] tracking-[-0.045em] sm:text-5xl">건물은 달라도,<br />운영 기준은 하나입니다.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">JNP가 다루는 현장 유형과 규모를 개인정보 없이 확인할 수 있도록 공개용 포트폴리오로 재구성했습니다.</p>
          </div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 shadow-2xl shadow-black/20">
            {[[allProperties.length.toString(), "운영 예시"], [PUBLIC_SHOWCASE_TOTAL_UNITS.toLocaleString("ko-KR"), "구성 세대"], ["4", "건물 유형"]].map(([value, label]) => (
              <div key={label} className="bg-[#152642]/90 px-3 py-5 text-center backdrop-blur-sm sm:px-5"><p className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</p><p className="mt-1 text-[11px] text-slate-400 sm:text-xs">{label}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5EAF1] bg-[#F6F8FB] py-6">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-6 text-sm leading-6 text-slate-600">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <p><strong className="text-[#16233A]">공개 기준:</strong> 아래 건물명·권역·이미지·세대 구성은 실제 운영 구조를 이해하기 위한 비식별 가상 예시이며, 계약 당사자와 상세 주소는 공개하지 않습니다.</p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <form className="mb-10 grid gap-3 rounded-2xl border border-[#DDE3EC] bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto]" action="/properties" method="get">
            <label className="relative block">
              <span className="sr-only">건물명 또는 지역 검색</span>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input name="q" defaultValue={sp.q ?? ""} placeholder="건물명 또는 지역 검색" className="h-12 w-full rounded-xl border border-[#DDE3EC] bg-[#F8FAFC] pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white" />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {[{ v: "all", l: "전체" }, { v: "officetel", l: "오피스텔" }, { v: "apartment", l: "아파트" }, { v: "villa", l: "빌라" }, { v: "commercial", l: "복합시설" }].map((type) => {
                const params = new URLSearchParams();
                if (sp.q) params.set("q", sp.q);
                if (type.v !== "all") params.set("type", type.v);
                const active = (sp.type ?? "all") === type.v;
                return <a key={type.v} href={`/properties?${params.toString()}`} aria-current={active ? "page" : undefined} className={`inline-flex h-12 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition ${active ? "border-[#16233A] bg-[#16233A] text-white" : "border-[#DDE3EC] bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>{type.l}</a>;
              })}
              <button type="submit" className="inline-flex h-12 shrink-0 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700">검색</button>
            </div>
          </form>

          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-blue-600">운영 포트폴리오</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#16233A] sm:text-3xl">총 {properties.length}개 현장 예시</h2></div>
            <p className="hidden text-sm text-slate-500 sm:block">모든 이미지는 서로 다른 가상 건물입니다.</p>
          </div>

          {properties.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center"><Building2 className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-4 font-semibold text-slate-700">조건에 맞는 현장이 없습니다.</p><Link href="/properties" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600">전체 보기 <ArrowRight className="h-4 w-4" /></Link></div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, index) => (
                <Link key={property.id} href={`/properties/${property.id}`} className="group animate-fade-in" style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
                  <article className="h-full overflow-hidden rounded-2xl border border-[#DDE3EC] bg-white transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-900/10">
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <Image src={property.imagePath} alt={`${property.name} 공개용 가상 건물 이미지`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.045]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528]/85 via-transparent to-transparent" />
                      <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/90 px-3 py-1 text-xs font-bold text-[#16233A] backdrop-blur">{PROPERTY_TYPE_LABEL[property.type] ?? property.type}</span>
                      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white"><p className="text-xs font-medium text-white/75">비식별 공개 예시</p><p className="text-xl font-bold tabular-nums">{property.totalUnits}세대</p></div>
                    </div>
                    <div className="p-5 sm:p-6">
                      <h3 className="text-xl font-bold tracking-[-0.025em] text-[#16233A]">{property.name}</h3>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {property.address}</p>
                      <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{property.summary}</p>
                      <div className="mt-5 flex flex-wrap gap-1.5">{property.focus?.slice(0, 2).map((item) => <span key={item} className="rounded-full bg-[#F0F4F9] px-2.5 py-1 text-[11px] font-semibold text-slate-600">{item}</span>)}</div>
                      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600">운영 구조 보기 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#101D34] py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className="text-sm font-bold text-blue-300">내 건물은 어떻게 달라질까요?</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">주소 하나면, 먼저 볼 문제부터 정리해드립니다.</h2><p className="mt-4 text-slate-300">공실·미수금·시설·민원을 한 번에 진단하고 우선순위를 제안합니다.</p></div>
          <Link href="/contact" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-white px-6 font-bold text-[#16233A] transition hover:bg-blue-50">무료 운영 진단 <CheckCircle2 className="h-5 w-5" /></Link>
        </div>
      </section>
    </main>
  );
}
