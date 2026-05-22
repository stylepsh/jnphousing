"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">오류가 발생했습니다</h1>
        <p className="mt-3 text-muted-foreground">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
        </p>
        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground font-mono">
            오류 코드: {error.digest}
          </p>
        )}
        <div className="mt-8 flex gap-3 justify-center">
          <Button onClick={reset}>
            <RotateCw className="h-4 w-4 mr-2" /> 다시 시도
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" /> 홈으로
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
