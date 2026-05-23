import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LandlordDialog } from "./landlord-dialog";
import { createClient } from "@/lib/supabase/server";
import { maskPhone, maskAccount, maskBusinessNumber } from "@/lib/pii";
import type { Landlord } from "@/types/lease";

async function fetchLandlords(): Promise<Landlord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landlords")
    .select("*")
    .order("name");
  return (data ?? []) as Landlord[];
}

export default async function LandlordsPage() {
  const landlords = await fetchLandlords();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임대인</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {landlords.length}명 · 계좌·사업자번호는 마스킹 표시</p>
        </div>
        <LandlordDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {landlords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">등록된 임대인이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>계좌 (마스킹)</TableHead>
                  <TableHead>사업자 (마스킹)</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {landlords.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-sm">{maskPhone(l.phone)}</TableCell>
                    <TableCell className="text-sm">{l.email ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.account_bank ? `${l.account_bank} · ` : ""}{maskAccount(l.account_number_encrypted)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{maskBusinessNumber(l.business_number_encrypted)}</TableCell>
                    <TableCell className="text-right">
                      <LandlordDialog mode="edit" landlord={l} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
