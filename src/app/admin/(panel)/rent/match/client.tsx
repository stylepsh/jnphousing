"use client";

import * as React from "react";
import Papa from "papaparse";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertCircle, Download, Banknote } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface BankRow {
  date: string;
  depositor: string;
  amount: number;
  memo?: string;
}

export function BankMatchClient() {
  const [rows, setRows] = React.useState<BankRow[]>([]);
  const [parsed, setParsed] = React.useState(false);

  function downloadTemplate() {
    const csv = "date,depositor,amount,memo\n2026-05-15,홍길동,500000,5월 월세\n2026-05-16,김철수,800000,\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bank_deposits_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        const data: BankRow[] = r.data
          .filter(d => d.depositor && d.amount)
          .map(d => ({
            date: d.date,
            depositor: d.depositor.trim(),
            amount: Number(d.amount.replace(/[^0-9-]/g, "")),
            memo: d.memo,
          }));
        setRows(data);
        setParsed(true);
      },
      error: (err) => {
        toast.error("CSV 파싱 실패", { description: err.message });
      },
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-600" />
                1. 은행 CSV 업로드
              </h2>
              <p className="text-xs text-muted-foreground mt-1">컬럼: date, depositor, amount, memo</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1" /> 템플릿 CSV
            </Button>
          </div>
          <label className="block border-2 border-dashed border-border rounded-xl px-6 py-10 text-center cursor-pointer hover:bg-muted/30 transition-colors">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">은행에서 다운받은 입금내역 CSV 선택</p>
            <p className="text-xs text-muted-foreground mt-1">대부분 은행은 인터넷뱅킹 → 거래내역 → CSV 다운로드 지원</p>
            <input type="file" accept=".csv" onChange={onFile} className="hidden" />
          </label>
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold">2. 입금 내역 ({rows.length}건)</h2>
              <Badge variant="outline">{rows.reduce((s, r) => s + r.amount, 0).toLocaleString()}원 합계</Badge>
            </div>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>입금자</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>적요</TableHead>
                    <TableHead>매칭</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{r.date}</TableCell>
                      <TableCell className="font-medium">{r.depositor}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.memo ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> 수동 매칭
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-6 py-4 border-t border-border bg-amber-50/50 text-xs text-amber-900">
              <p className="font-bold mb-1">⚠️ 자동 매칭 알고리즘 (개발 진행 중)</p>
              <ul className="ml-4 list-disc space-y-0.5">
                <li>임차인명 fuzzy 검색 (Levenshtein 거리 ≤ 1)</li>
                <li>미납 청구서 중 가장 가까운 금액과 매칭</li>
                <li>매칭 결과 확인 후 일괄 입금 등록 → revalidate /admin/rent</li>
                <li>현재는 수동 등록만 권장. <a href="/admin/rent" className="underline">월세 현황</a> 페이지에서 직접 입금 등록.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
