import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = {
  title: "민원 조회",
  description: "접수번호와 연락처로 민원 처리 상태를 확인합니다.",
};

export default function LookupPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link href="/tenant" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> 입주민 메인
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">내 민원 조회</h1>
        <p className="mt-2 text-muted-foreground">
          접수번호와 연락처를 입력하시면 처리 상태를 확인할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardContent className="pt-8">
          <LookupForm />
        </CardContent>
      </Card>
    </div>
  );
}
