import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  MessageCircle,
  ShieldCheck,
  Star,
  UserRoundCheck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PUBLIC_REVIEWS, averageRating } from "@/lib/data/reviews";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "고객 후기",
  description: "원문 확인과 게재 동의를 마친 JNP주택관리 고객 후기를 공개합니다.",
  openGraph: {
    title: "JNP 고객 후기",
    description: "확인된 고객의 목소리만 투명하게 공개합니다.",
    images: [`/api/og?title=${encodeURIComponent("고객 후기")}&subtitle=${encodeURIComponent("확인된 고객의 목소리")}`],
  },
  alternates: { canonical: "/reviews" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`평점 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((score) => (
        <Star
          key={score}
          aria-hidden="true"
          className={
            score <= rating
              ? "h-4 w-4 fill-amber-400 text-amber-400"
              : "h-4 w-4 text-slate-300"
          }
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const average = averageRating();
  const hasReviews = PUBLIC_REVIEWS.length > 0;

  return (
    <main id="main-content" className="bg-white">
      <section className="border-b border-[#E5EAF1] bg-[#14233F] py-16 text-white md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Breadcrumbs items={[{ name: "고객 후기" }]} className="mb-5 text-white/70" />
          <p className="text-sm font-semibold text-blue-300">CUSTOMER VOICE</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] md:text-5xl">고객 후기</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100 md:text-lg">
            보기 좋은 문장을 만들기보다, 원문 확인과 게재 동의를 마친 고객의 경험만 공개합니다.
          </p>

          {hasReviews && (
            <div className="mt-7 inline-flex items-center gap-4 rounded-xl border border-white/15 bg-white/10 px-5 py-3">
              <Stars rating={Math.round(average)} />
              <div>
                <p className="text-xl font-bold">{average.toFixed(1)} / 5.0</p>
                <p className="text-xs text-blue-200">확인 완료 후기 {PUBLIC_REVIEWS.length}건</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          {hasReviews ? (
            <div className="grid gap-5 md:grid-cols-2">
              {PUBLIC_REVIEWS.map((review) => (
                <article key={review.id} className="rounded-2xl border border-[#DDE3EC] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <Stars rating={review.rating} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" /> 원문·동의 확인
                    </span>
                  </div>
                  <h2 className="mt-5 text-xl font-bold leading-snug text-[#16233A]">{review.title}</h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">{review.body}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#E8ECF2] pt-4 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{review.authorAlias}</span>
                    <span aria-hidden="true">·</span>
                    <span>{review.authorRoleLabel}</span>
                    {review.buildingHint && <span>· {review.buildingHint}</span>}
                    <time className="ml-auto" dateTime={review.createdAt}>{review.createdAt}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[#DDE3EC] bg-[#F7F9FC]">
              <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                <div className="p-7 sm:p-10 lg:p-12">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                    <MessageCircle className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="mt-7 text-sm font-semibold text-primary">후기 자료 확인 중</p>
                  <h2 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.03em] text-[#16233A] sm:text-3xl">
                    확인되지 않은 후기를<br className="hidden sm:block" /> 먼저 보여드리지 않겠습니다.
                  </h2>
                  <p className="mt-4 max-w-xl leading-7 text-slate-600">
                    현재 보유 자료의 원문과 게재 동의를 정리하고 있습니다. 확인이 끝난 후기부터 개인정보를 가려 순차적으로 공개하겠습니다.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Link href="/properties" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-white hover:bg-[#13213D]">
                      관리현장 보기 <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#CCD5E2] bg-white px-5 font-semibold text-[#16233A] hover:bg-slate-50">
                      관리 상담하기
                    </Link>
                  </div>
                </div>

                <div className="border-t border-[#DDE3EC] bg-white p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
                  <p className="text-sm font-semibold text-[#16233A]">공개 전 확인 절차</p>
                  <ol className="mt-6 space-y-5">
                    {[
                      { icon: FileCheck2, title: "원문 확인", body: "카카오톡·문자·서면 원문과 공개 문구를 대조합니다." },
                      { icon: UserRoundCheck, title: "게재 동의", body: "작성자에게 공개 범위와 익명 처리 내용을 확인합니다." },
                      { icon: ShieldCheck, title: "개인정보 보호", body: "이름·연락처·상세 주소 등 식별 정보를 가립니다." },
                    ].map(({ icon: Icon, title, body }, index) => (
                      <li key={title} className="flex gap-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FA] text-primary">
                          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-bold text-[#16233A]">{index + 1}. {title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-[#DDE3EC] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-[#16233A]">JNP 서비스를 이용하셨나요?</p>
              <p className="mt-1 text-sm text-slate-600">후기 공개 여부와 익명 범위는 작성자와 협의합니다.</p>
            </div>
            <a
              href={COMPANY.contact.kakaoOpenChat}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-5 text-sm font-bold text-[#3C1E1E] hover:bg-[#F4D900]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> 후기 전달하기
              <span className="sr-only">(새 창)</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
