import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { LandlordBusinessForm } from "../_components/landlord-business-form";

export const metadata: Metadata = { title: "임사자 추가" };

export default function NewLandlordBusinessPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/admin/landlord-business" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> 임사자 목록
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임사자 추가</h1>
        <p className="mt-1 text-sm text-muted-foreground">JNP주택관리가 위탁받은 임대사업자/법인 등록</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <LandlordBusinessForm />
        </CardContent>
      </Card>
    </div>
  );
}
