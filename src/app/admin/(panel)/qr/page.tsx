import { Card, CardContent } from "@/components/ui/card";
import { QrCode } from "lucide-react";

export default function QrPlaceholderPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">QR 코드 생성</h1>
      <Card>
        <CardContent className="py-16 text-center">
          <QrCode className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">QR 생성 기능은 Phase 6 에서 본격 구현됩니다.</p>
          <p className="text-xs text-muted-foreground mt-2">
            건물 선택 → QR 자동 생성 → A4 인쇄용 PDF 다운로드 흐름이 추가될 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
