"use client";

import * as React from "react";
import Papa from "papaparse";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { bulkImportTenants } from "./actions";

const TEMPLATE_HEADERS = ["name", "phone", "emergency_contact", "emergency_relation", "address", "memo"];
const REQUIRED_FIELDS = ["name", "phone"];

interface ParsedRow {
  index: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

export function TenantImportClient() {
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; inserted?: number; errors?: number; error?: string } | null>(null);

  function downloadTemplate() {
    const csv = TEMPLATE_HEADERS.join(",") + "\n" + "홍길동,010-1234-5678,홍부모,부친,서울시 서초구,참고사항\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tenants_template.csv";
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
        const parsed: ParsedRow[] = r.data.map((data, index) => {
          const errors: string[] = [];
          for (const f of REQUIRED_FIELDS) {
            if (!data[f]?.trim()) errors.push(`${f} 누락`);
          }
          if (data.phone && !/^[\d-]+$/.test(data.phone)) errors.push("phone 형식");
          return { index, data, valid: errors.length === 0, errors };
        });
        setRows(parsed);
        setResult(null);
      },
      error: (err) => {
        toast.error("CSV 파싱 실패", { description: err.message });
      },
    });
  }

  async function onSubmit() {
    const validRows = rows.filter(r => r.valid).map(r => r.data);
    if (validRows.length === 0) {
      toast.error("등록할 유효한 행이 없습니다.");
      return;
    }
    setPending(true);
    try {
      const r = await bulkImportTenants(validRows);
      setResult(r);
      if (r.ok) toast.success(`${r.inserted}건 등록 완료`);
      else toast.error("등록 실패", { description: r.error });
    } finally {
      setPending(false);
    }
  }

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">1. 템플릿 다운로드 + CSV 업로드</h2>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1" /> 템플릿 CSV
            </Button>
          </div>
          <label className="block border-2 border-dashed border-border rounded-xl px-6 py-10 text-center cursor-pointer hover:bg-muted/30 transition-colors">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">CSV 파일 선택</p>
            <p className="text-xs text-muted-foreground mt-1">컬럼: {TEMPLATE_HEADERS.join(", ")} (필수: {REQUIRED_FIELDS.join(", ")})</p>
            <input type="file" accept=".csv" onChange={onFile} className="hidden" />
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h2 className="font-bold">2. 미리보기 ({rows.length}행)</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> 유효 {validCount}
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> 오류 {invalidCount}
                  </Badge>
                )}
              </div>
            </div>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead className="w-[60px]">상태</TableHead>
                    {TEMPLATE_HEADERS.map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map(r => (
                    <TableRow key={r.index} className={!r.valid ? "bg-red-50/40" : ""}>
                      <TableCell className="text-xs">{r.index + 1}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <span className="text-[10px] text-red-700" title={r.errors.join(", ")}>오류</span>
                        )}
                      </TableCell>
                      {TEMPLATE_HEADERS.map(h => (
                        <TableCell key={h} className="text-xs">{r.data[h] ?? "-"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 100 && (
                <p className="text-xs text-center text-muted-foreground py-2">+ {rows.length - 100}건 더 (상위 100건 표시)</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setRows([])}>취소</Button>
              <Button onClick={onSubmit} disabled={pending || validCount === 0} loading={pending}>
                {validCount}건 등록
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className={result.ok ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}>
          <CardContent className="p-5 flex items-center gap-3">
            {result.ok ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
            <div>
              <p className="font-bold">{result.ok ? `${result.inserted}건 등록 완료` : "등록 실패"}</p>
              {result.error && <p className="text-sm text-muted-foreground mt-0.5">{result.error}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
