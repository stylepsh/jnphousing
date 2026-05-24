"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Property {
  id: string;
  name: string;
  address?: string;
}

interface BuildingSelectModalProps {
  properties: Property[];
  /** QR 진입 시 b=속성ID 형태로 전달됨. b 가 없을 때만 모달 표시. */
  forceShow?: boolean;
}

const DISMISSED_KEY = "jnp.building-select.dismissed";

/**
 * 임차인 첫 진입 모달 (P27-78).
 * QR 코드로 들어왔으면 ?b=... 자동 설정, 없으면 건물 선택 안내.
 */
export function BuildingSelectModal({ properties, forceShow }: BuildingSelectModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasBuilding = !!searchParams.get("b");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (hasBuilding) return;
    if (forceShow) {
      setOpen(true);
      return;
    }
    // localStorage 에 'dismissed' 표시되어 있으면 안 띄움 (같은 세션 재진입)
    try {
      if (sessionStorage.getItem(DISMISSED_KEY)) return;
    } catch {}
    // 800ms 후 fade-in
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [hasBuilding, forceShow]);

  function selectBuilding(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("b", id);
    router.push(`?${params.toString()}`);
    setOpen(false);
    try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch {}
  }

  function dismiss() {
    setOpen(false);
    try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-br from-primary to-slate-800 text-white px-6 py-5 relative">
          <button onClick={dismiss} className="absolute top-3 right-3 text-white/70 hover:text-white" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">JNP주택관리 입주민존</p>
              <p className="text-xs text-blue-200 mt-0.5">QR 코드 또는 거주 건물을 선택해 주세요</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs text-muted-foreground mb-3">
            <strong className="text-foreground">📱 QR 코드 안내:</strong>
            건물 입구·게시판에 부착된 QR 코드를 스캔하면 자동으로 해당 건물이 선택됩니다.
          </p>

          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {properties.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-6">등록된 건물이 아직 없습니다.</p>
            ) : (
              properties.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectBuilding(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Building2 className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{p.name}</div>
                    {p.address && <div className="text-[11px] text-muted-foreground line-clamp-1">{p.address}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 bg-muted/30 flex items-center justify-between">
          <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground underline">
            모든 건물 보기
          </button>
          <Button asChild size="sm" variant="outline">
            <a href="tel:01075086916">전화 문의</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
