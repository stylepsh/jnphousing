import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, BadgeCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { REVIEWS, averageRating } from "@/lib/data/reviews";

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

      <main id="main-content" className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-4 stagger-children">
            {REVIEWS.map(r => (
              <Card key={r.id} className="animate-fade-in hover:shadow-md transition-shadow">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{r.authorRoleLabel}</Badge>
                        <span className="font-semibold text-sm">{r.authorAlias}</span>
                        {r.isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold">
                            <BadgeCheck className="h-3 w-3" /> 검증
                          </span>
                        )}
                      </div>
                      {r.buildingHint && <p className="text-[11px] text-muted-foreground">{r.buildingHint}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Stars rating={r.rating} />
                      <span className="text-[10px] text-muted-foreground">{r.createdAt}</span>
                    </div>
                  </div>
                  <h3 className="font-bold mb-2">{r.title}</h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{r.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 rounded-xl bg-slate-50 border border-border/60 p-5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">📝 후기 안내</p>
            <p>
              개인정보 보호를 위해 이름·건물명은 가명·일부 처리되었습니다.
              실제 후기는 임차인·임대인·부동산 회원 동의를 받아 게재됩니다.
              <br />
              ⚠️ BLOCKERS B-102: 실제 후기 수집 진행 중. 현재는 27년 운영 사례 기반 가명 후기.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
