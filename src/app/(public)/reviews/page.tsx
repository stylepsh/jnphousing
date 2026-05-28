import type { Metadata } from "next";
import { Star, BadgeCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { REVIEWS, averageRating } from "@/lib/data/reviews";
import { cn } from "@/lib/utils";

const ROLE_PROFILE: Record<string, { emoji: string; bg: string }> = {
  landlord: { emoji: "🏢", bg: "bg-blue-100" },
  tenant:   { emoji: "🏠", bg: "bg-emerald-100" },
  agency:   { emoji: "🤝", bg: "bg-amber-100" },
};

function formatKakaoDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export const metadata: Metadata = {
  title: "고객 후기",
  description: "JNP주택관리 임차인·임대인·부동산 회원의 실제 후기",
  openGraph: {
    title: "JNP 고객 후기",
    description: "27년 위탁임대의 신뢰",
    images: [`/api/og?title=${encodeURIComponent("고객 후기")}&subtitle=${encodeURIComponent("27년 위탁임대의 신뢰")}`],
  },
  alternates: { canonical: "/reviews" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={i <= rating ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const avg = averageRating();

  return (
    <>
      <section className="bg-gradient-to-br from-primary via-primary to-slate-800 text-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Breadcrumbs items={[{ name: "고객 후기" }]} className="text-white/70 mb-5" />
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold">
            <Star className="h-3.5 w-3.5" /> Reviews
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">고객 후기</h1>
          <p className="mt-3 text-blue-100">실제 임차인·임대인·부동산 회원의 경험.</p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur px-5 py-3 border border-white/20">
            <Stars rating={Math.round(avg)} />
            <div>
              <div className="text-2xl font-bold">{avg.toFixed(1)}/5.0</div>
              <div className="text-[11px] text-blue-200">{REVIEWS.length}건의 검증된 후기</div>
            </div>
          </div>
        </div>
      </section>

      {/* 카톡 단톡방 형식 후기 */}
      <main id="main-content" className="bg-[#b2c7d9] py-12 md:py-16">
        <div className="mx-auto max-w-2xl px-4">
          {/* 단톡방 안내 바 */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-1.5 bg-black/10 rounded-full px-4 py-1.5 text-xs text-slate-700 font-medium">
              💬 JNP주택관리 고객 후기방 · 참여자 {REVIEWS.length}명
            </div>
          </div>

          <div className="space-y-5 stagger-children">
            {REVIEWS.map(r => {
              const profile = ROLE_PROFILE[r.authorRole] ?? ROLE_PROFILE.tenant;
              return (
                <div key={r.id} className="flex gap-2.5 animate-fade-in">
                  {/* 프로필 */}
                  <div className={cn("h-11 w-11 rounded-2xl shrink-0 flex items-center justify-center text-xl shadow-sm", profile.bg)}>
                    {profile.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 mb-1 ml-1 font-medium">
                      {r.authorAlias}
                      <span className="ml-1.5 text-slate-500 font-normal">· {r.authorRoleLabel}</span>
                    </p>
                    <div className="flex items-end gap-1.5">
                      {/* 말풍선 */}
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 max-w-[88%] shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Stars rating={r.rating} />
                          {r.isVerified && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                              <BadgeCheck className="h-3.5 w-3.5" /> 검증
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm text-slate-900 leading-snug">{r.title}</p>
                        <p className="text-sm text-slate-700 leading-relaxed mt-1.5">{r.body}</p>
                        {r.buildingHint && (
                          <p className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                            📍 {r.buildingHint}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-600/80 shrink-0 mb-1 whitespace-nowrap">
                        {formatKakaoDate(r.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* JNP 답변 말풍선 (오른쪽, 노란색) */}
          <div className="flex justify-end mt-5">
            <div className="flex items-end gap-1.5 max-w-[88%]">
              <span className="text-[10px] text-slate-600/80 shrink-0 mb-1">방금</span>
              <div className="bg-[#fee500] rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
                <p className="text-sm text-slate-900 leading-relaxed">
                  소중한 후기 감사합니다 🙏 앞으로도 주거의 가치를 끝까지 책임지겠습니다.
                </p>
                <p className="text-[11px] text-slate-700/70 mt-1.5 font-semibold">— JNP주택관리</p>
              </div>
            </div>
          </div>

          {/* 안내 */}
          <div className="mt-10 rounded-xl bg-white/70 backdrop-blur border border-white/40 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">후기 안내</p>
            <p className="leading-relaxed">
              개인정보 보호를 위해 이름·건물명은 가명·일부 처리되었습니다.
              실제 후기는 임차인·임대인·부동산 회원 동의를 받아 게재됩니다.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
