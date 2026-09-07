"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-panel] render failed", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6">
      <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm" role="alert">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-bold">운영 데이터를 불러오지 못했습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          빈 데이터로 처리하지 않았습니다. 잠시 후 다시 시도하고, 반복되면 관리자에게 알려주세요.
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted-foreground">오류 번호: {error.digest}</p>}
        <Button type="button" className="mt-5" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" /> 다시 불러오기
        </Button>
      </div>
    </div>
  );
}
