"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Clock, TrendingUp } from "lucide-react";
import type { CaseStudy } from "@/lib/data/cases";
import { cn } from "@/lib/utils";

interface CaseCarouselProps {
  cases: CaseStudy[];
}

export function CaseCarousel({ cases }: CaseCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    skipSnaps: false,
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(true);
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
      setSelectedIdx(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5">
          {cases.map((c) => (
            <div key={c.id} className="flex-[0_0_85%] sm:flex-[0_0_60%] lg:flex-[0_0_38%] min-w-0">
              <Card className="h-full hover:shadow-lg transition-shadow border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", c.badgeColor)}>
                      {c.badge}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {c.durationMonths}개월
                    </span>
                  </div>
                  <h3 className="text-base font-bold mb-1">{c.categoryLabel}</h3>
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {c.location} · {c.buildingType} · {c.clientAlias}
                  </p>

                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">상황</div>
                      <p className="text-foreground/85 leading-relaxed">{c.problem}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">결과</div>
                      <p className="text-foreground/85 leading-relaxed">{c.result}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      {c.metric.label}
                    </span>
                    <span className="text-base font-bold text-primary tabular-nums">{c.metric.value}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-5">
        <div className="flex gap-1">
          {cases.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => emblaApi?.scrollTo(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === selectedIdx ? "w-6 bg-primary" : "w-1.5 bg-border"
              )}
              aria-label={`사례 ${idx + 1} 로 이동`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="이전 사례"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="다음 사례"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
