import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TenantDialog } from "./tenant-dialog";
import { createClient } from "@/lib/supabase/server";
import { maskPhone, maskIdNumber } from "@/lib/pii";
import { formatKoreanDate } from "@/lib/dates";
import type { Tenant } from "@/types/lease";

async function fetchTenants(): Promise<Tenant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .order("name");
  return (data ?? []) as Tenant[];
}

export default async function TenantsPage() {
  const tenants = await fetchTenants();

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임차인</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {tenants.length}명 · 주민번호는 마스킹 표시</p>
        </div>
        <TenantDialog mode="create" />
      </div>

      <Card>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">등록된 임차인이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>주민번호 (마스킹)</TableHead>
                  <TableHead>비상연락</TableHead>
                  <TableHead>입주일</TableHead>
                  <TableHead>퇴거일</TableHead>
                  <TableHead className="text-right w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm">{maskPhone(t.phone)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{maskIdNumber(t.id_number_encrypted)}</TableCell>
                    <TableCell className="text-sm">{t.emergency_contact ? maskPhone(t.emergency_contact) : "-"}</TableCell>
                    <TableCell className="text-xs">{t.move_in_date ? formatKoreanDate(t.move_in_date) : "-"}</TableCell>
                    <TableCell className="text-xs">{t.move_out_date ? formatKoreanDate(t.move_out_date) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <TenantDialog mode="edit" tenant={t} />
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
