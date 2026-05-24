"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteVacancyImage } from "./actions";

interface VacancyImage {
  id: string;
  url: string;
  caption: string | null;
  display_order: number;
}

export function ImageGallery({ images }: { images: VacancyImage[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDelete(id: string) {
    if (!confirm("이 사진을 삭제하시겠습니까? Storage 파일도 함께 제거됩니다.")) return;
    setPendingId(id);
    startTransition(async () => {
      const r = await deleteVacancyImage(id);
      setPendingId(null);
      if (r.ok) {
        toast.success("삭제되었습니다.");
        router.refresh();
      } else {
        toast.error("실패", { description: r.error });
      }
    });
  }

  if (images.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">아직 등록된 사진이 없습니다. 우상단 &quot;사진 추가&quot; 버튼으로 업로드하세요.</p>
        <p className="text-xs mt-1">현장 사진 20~30장 권장 — 외관·내부·복도·옵션·하자 부위 포함</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {images.map((img, idx) => (
        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.caption ?? `사진 ${idx + 1}`} className="w-full h-full object-cover" />
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
            {idx + 1}
          </div>
          <button
            type="button"
            onClick={() => onDelete(img.id)}
            disabled={pendingId === img.id}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-100"
            aria-label="사진 삭제"
          >
            {pendingId === img.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          </button>
        </div>
      ))}
    </div>
  );
}
