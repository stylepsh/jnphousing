"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Building2 } from "lucide-react";
import { COMPANY } from "@/lib/company";

interface Property {
  id: string;
  name: string;
  address: string;
}

export function QrPrintWorkspace({ properties }: { properties: Property[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const property = properties.find((p) => p.id === propertyId);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const tenantUrl = property ? `${baseUrl}/tenant?b=${property.id}` : "";

  useEffect(() => {
    if (!tenantUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, tenantUrl, {
      width: 640,
      margin: 2,
      color: { dark: "#1c3a5e", light: "#ffffff" },
    });
  }, [tenantUrl]);

  function downloadPng() {
    if (!canvasRef.current || !property) return;
    const link = document.createElement("a");
    link.download = `JNP-QR-${property.name}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function printPage() {
    window.print();
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4 print:hidden">
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            <div>
              <Label>건물 선택</Label>
              <Select value={propertyId} onValueChange={(v) => v && setPropertyId(v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {tenantUrl && (
              <div>
                <Label>QR URL</Label>
                <Input value={tenantUrl} readOnly className="mt-1.5 text-xs font-mono" />
              </div>
            )}
            <div className="space-y-2 pt-2">
              <Button onClick={downloadPng} className="w-full" disabled={!property}>
                <Download className="h-4 w-4 mr-2" /> PNG 다운로드
              </Button>
              <Button onClick={printPage} className="w-full" variant="outline" disabled={!property}>
                <Printer className="h-4 w-4 mr-2" /> 인쇄 (A4)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              인쇄 미리보기에서 A4 세로, 여백 최소로 설정하세요.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 인쇄용 영역 */}
      <div className="lg:col-span-2">
        <div
          className="bg-white border border-border rounded-lg overflow-hidden print:border-0 print:rounded-none"
          style={{ aspectRatio: "210 / 297" }}
        >
          <div className="h-full flex flex-col items-center justify-between p-8 sm:p-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="text-2xl font-bold text-primary">JNP주택관리</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {COMPANY.legalName} · 위탁임대 전문
              </p>
            </div>

            <div className="text-center my-4">
              <h2 className="text-3xl font-bold tracking-tight">{property?.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{property?.address}</p>
            </div>

            <div className="rounded-2xl bg-white border-4 border-primary p-4">
              <canvas ref={canvasRef} className="block max-w-full" />
            </div>

            <div className="text-center mt-6">
              <p className="text-lg font-bold">📱 QR을 스캔하시면</p>
              <div className="mt-3 grid grid-cols-3 gap-2 max-w-md mx-auto">
                <Card className="border-primary/20">
                  <CardContent className="py-3 text-center">
                    <p className="text-xs font-bold">민원·AS</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">간편 접수</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="py-3 text-center">
                    <p className="text-xs font-bold">공지사항</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">실시간 확인</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="py-3 text-center">
                    <p className="text-xs font-bold">서류 다운</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">계약서·서식</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground mt-4">
              <p>관리실 문의: {COMPANY.contact.phone}</p>
              <p className="mt-0.5">카카오톡: {COMPANY.contact.kakaoOpenChat.replace("https://", "")}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-target, .print-target * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}
