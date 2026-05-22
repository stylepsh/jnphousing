import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Wrench, FileText, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero placeholder — Phase 2 에서 정식 디자인 */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <Badge variant="secondary" className="mb-6">
            Phase 0 셋업 완료
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            신뢰로 관리하는 주거공간,
            <br />
            <span className="text-blue-300">JNP주택관리</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-blue-100">
            주택관리부터 위탁임대관리까지, 합리적이고 투명한 전문 서비스.
          </p>
          <div className="mt-10 flex gap-4">
            <Button size="lg" variant="secondary">
              관리문의하기 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
              관리현장 보기
            </Button>
          </div>
        </div>
      </section>

      {/* 디자인 토큰 확인 카드 */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight mb-2">디자인 시스템 미리보기</h2>
        <p className="text-muted-foreground mb-10">
          Pretendard 폰트, 브랜드 컬러, shadcn 컴포넌트가 정상 동작하는지 확인용 페이지. Phase 2 에서 정식 메인으로 교체됩니다.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>주택관리</CardTitle>
              <CardDescription>건물 시설, 청소, 보안까지 종합 관리</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                전문 인력이 상주하여 건물의 가치를 유지합니다.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Wrench className="h-8 w-8 text-primary mb-2" />
              <CardTitle>위탁임대관리</CardTitle>
              <CardDescription>임차인 관리, 임대료 수납, 공실 매물</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                소유주는 결과만 보고받으시면 됩니다.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>입주민 서비스</CardTitle>
              <CardDescription>QR 진입 민원접수, 공지, 서류 다운로드</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                전화 없이 온라인으로 빠르게 처리됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
