"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  FileCheck2,
  KeyRound,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  speaker: "customer" | "tenant" | "jnp";
  text: string;
  time: string;
};

const CONVERSATIONS = [
  {
    category: "공실 대응",
    participant: "건물주 문의",
    title: "문의가 끊긴 공실, 어디부터 바꿔야 할까요?",
    icon: KeyRound,
    nextAction: "현장 확인 후 수선 범위와 모집 순서를 제안",
    messages: [
      { speaker: "customer", text: "공실이 오래됐는데 문의가 거의 없어요.", time: "오전 10:12" },
      { speaker: "jnp", text: "사진과 임대 조건을 먼저 확인하고 현장도 살펴보겠습니다.", time: "오전 10:14" },
      { speaker: "customer", text: "광고만 다시 올리면 될까요?", time: "오전 10:16" },
      { speaker: "jnp", text: "수선·촬영·가격·중개 채널을 나눠 우선순위부터 정리해 드릴게요.", time: "오전 10:18" },
    ] satisfies Message[],
  },
  {
    category: "미수금 관리",
    participant: "건물주 문의",
    title: "이번 달 미납 세대 진행 상황이 궁금해요.",
    icon: WalletCards,
    nextAction: "납부일 확인부터 연락 기록·정산 반영까지 관리",
    messages: [
      { speaker: "customer", text: "이번 달 입금이 안 된 세대가 있나요?", time: "오후 1:05" },
      { speaker: "jnp", text: "미납 세대를 확인해 납부 예정일과 연락 내용을 기록 중입니다.", time: "오후 1:07" },
      { speaker: "customer", text: "제가 직접 연락해야 할까요?", time: "오후 1:09" },
      { speaker: "jnp", text: "일차 안내는 저희가 진행하고 변동 사항을 정산 보고에 함께 남기겠습니다.", time: "오후 1:11" },
    ] satisfies Message[],
  },
  {
    category: "누수·시설",
    participant: "입주민 접수",
    title: "천장에서 물이 떨어져요. 바로 확인될까요?",
    icon: Droplets,
    nextAction: "사진 접수 후 담당 배정·방문 결과까지 공유",
    messages: [
      { speaker: "tenant", text: "주방 천장에서 물이 떨어져요. 어떻게 해야 하나요?", time: "오전 9:21" },
      { speaker: "jnp", text: "안전을 먼저 확인하겠습니다. 누수 위치 사진을 보내주세요.", time: "오전 9:22" },
      { speaker: "tenant", text: "사진 보냈습니다. 외출해도 될까요?", time: "오전 9:24" },
      { speaker: "jnp", text: "확인했습니다. 방문 가능 시간을 조율하고 처리 결과도 다시 안내드릴게요.", time: "오전 9:26" },
    ] satisfies Message[],
  },
  {
    category: "HUG·경매 운영 검토",
    participant: "자산 담당자 문의",
    title: "경매 진행 중인 건물도 운영 검토가 되나요?",
    icon: Building2,
    nextAction: "권리·점유·공실 자료 확인 후 가능한 업무 범위 안내",
    messages: [
      { speaker: "customer", text: "HUG 관련 절차가 진행 중인데 공실 관리도 가능할까요?", time: "오후 3:32" },
      { speaker: "jnp", text: "먼저 현재 권리·점유 상태와 현장 자료를 확인해야 합니다.", time: "오후 3:34" },
      { speaker: "customer", text: "어떤 자료를 보내면 될까요?", time: "오후 3:36" },
      { speaker: "jnp", text: "사건 정보와 세대 현황을 주시면 가능한 관리 범위부터 구분해 드리겠습니다.", time: "오후 3:38" },
    ] satisfies Message[],
  },
  {
    category: "월간 정산 보고",
    participant: "건물주 문의",
    title: "입금과 지출 내역을 한 번에 보고 싶어요.",
    icon: ReceiptText,
    nextAction: "수입·지출·미수·처리 현황을 월간 보고로 정리",
    messages: [
      { speaker: "customer", text: "이번 달 입금과 수리비를 같이 볼 수 있을까요?", time: "오전 11:02" },
      { speaker: "jnp", text: "네. 수입·지출·미수금과 주요 처리 내역을 한 보고서로 정리합니다.", time: "오전 11:04" },
      { speaker: "customer", text: "증빙도 함께 확인하고 싶어요.", time: "오전 11:06" },
      { speaker: "jnp", text: "확인 가능한 증빙과 특이사항을 항목별로 연결해 공유드리겠습니다.", time: "오전 11:08" },
    ] satisfies Message[],
  },
  {
    category: "퇴거·보증금",
    participant: "건물주 문의",
    title: "퇴거 일정과 다음 임대를 같이 준비할 수 있나요?",
    icon: FileCheck2,
    nextAction: "퇴거 점검·정산·원상복구·재임대 일정을 연결",
    messages: [
      { speaker: "customer", text: "다음 달 퇴거인데 보증금 정산이 걱정됩니다.", time: "오후 4:10" },
      { speaker: "jnp", text: "계약서와 납부 내역을 확인하고 퇴거 점검 일정을 먼저 잡겠습니다.", time: "오후 4:12" },
      { speaker: "customer", text: "새 임차인 모집도 이어서 가능할까요?", time: "오후 4:14" },
      { speaker: "jnp", text: "원상복구 범위를 확인한 뒤 촬영과 모집 시점을 함께 계획하겠습니다.", time: "오후 4:16" },
    ] satisfies Message[],
  },
] as const;

export function ConversationShowcase() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: false,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const updateCarouselState = React.useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnaps(emblaApi.scrollSnapList());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    updateCarouselState();
    emblaApi.on("select", updateCarouselState);
    emblaApi.on("reInit", updateCarouselState);
    return () => {
      emblaApi.off("select", updateCarouselState);
      emblaApi.off("reInit", updateCarouselState);
    };
  }, [emblaApi, updateCarouselState]);

  return (
    <div
      className="mt-10"
      role="region"
      aria-roledescription="carousel"
      aria-label="건물 관리 상담 대화 예시"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") emblaApi?.scrollPrev();
        if (event.key === "ArrowRight") emblaApi?.scrollNext();
      }}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5">
          {CONVERSATIONS.map(({ category, participant, title, icon: Icon, nextAction, messages }, index) => (
            <article
              key={category}
              role="group"
              aria-roledescription="slide"
              aria-label={`${CONVERSATIONS.length}개 중 ${index + 1}번째: ${category}`}
              className="min-w-0 shrink-0 grow-0 basis-[91%] sm:basis-[70%] lg:basis-[calc((100%_-_2.5rem)/3)]"
            >
              <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-[1.4rem] border border-[#CFD8E5] bg-white shadow-[0_18px_55px_-35px_rgba(15,31,58,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_65px_-32px_rgba(15,31,58,0.45)] motion-reduce:transform-none motion-reduce:transition-none">
                <header className="flex items-center gap-3 border-b border-[#D6DEE8] bg-[#9FB4CB] px-4 py-3.5 text-[#13233F]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{participant}</p>
                    <p className="text-[11px] font-semibold text-[#263A55]">JNP주택관리 상담창구</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-white/65 px-2 py-1 text-[10px] font-bold">예시</span>
                </header>

                <div className="bg-[#B6C9DB] px-3.5 py-4">
                  <div className="mb-4 text-center">
                    <span className="inline-flex rounded-full bg-white/55 px-3 py-1 text-[10px] font-semibold text-[#263B55]">상담·운영 대화 예시</span>
                    <h3 className="mx-auto mt-2 max-w-[18rem] text-sm font-bold leading-5 text-[#13233F]">{title}</h3>
                  </div>
                  <div className="space-y-2.5">
                    {messages.map((message, messageIndex) => {
                      const isJnp = message.speaker === "jnp";
                      return (
                        <div key={`${message.time}-${messageIndex}`} className={cn("flex items-end gap-1.5", isJnp ? "justify-end" : "justify-start")}>
                          {!isJnp && (
                            <span className="flex h-7 w-7 shrink-0 self-start items-center justify-center rounded-full bg-white text-[9px] font-extrabold text-[#193153] shadow-sm" aria-hidden="true">
                              {message.speaker === "tenant" ? "입주" : "문의"}
                            </span>
                          )}
                          {isJnp && <span className="mb-0.5 text-[10px] font-medium text-[#33465F]">{message.time}</span>}
                          <p className={cn(
                            "max-w-[76%] rounded-2xl px-3 py-2.5 text-[12.5px] leading-[1.55] shadow-sm",
                            isJnp ? "rounded-tr-sm bg-[#FEE500] text-[#3C1E1E]" : "rounded-tl-sm bg-white text-[#24354D]"
                          )}>
                            <span className="sr-only">{isJnp ? "JNP 답변: " : `${participant}: `}</span>
                            {message.text}
                          </p>
                          {!isJnp && <span className="mb-0.5 text-[10px] font-medium text-[#33465F]">{message.time}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <footer className="mt-auto border-t border-[#E1E6ED] bg-white px-4 py-4">
                  <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#284064]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    {nextAction}
                  </p>
                </footer>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center" aria-label="대화 예시 페이지">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => emblaApi?.scrollTo(index)}
              className="group inline-flex h-11 min-w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`대화 예시 ${index + 1}로 이동`}
              aria-current={selectedIndex === index ? "true" : undefined}
            >
              <span
                className={cn(
                  "h-2 rounded-full transition-all motion-reduce:transition-none",
                  selectedIndex === index ? "w-7 bg-primary" : "w-2 bg-[#CBD4E1] group-hover:bg-[#9EABBC]"
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4DCE7] bg-white text-[#16233A] transition hover:border-primary/40 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="이전 대화 예시"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4DCE7] bg-white text-[#16233A] transition hover:border-primary/40 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="다음 대화 예시"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3.5 text-xs leading-5 text-[#42546C]">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
        <p><strong className="text-[#263A58]">안내:</strong> 위 내용은 실제 고객 후기나 대화 원문이 아니라, 상담과 운영 방식을 이해하기 위한 비식별 예시입니다.</p>
      </div>
    </div>
  );
}
