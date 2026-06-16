"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button size="sm" variant="outline" className="gap-1 print:hidden" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" /> 인쇄 / PDF 저장
    </Button>
  );
}
