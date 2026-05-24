import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "광고 채널 통계" };

interface Channel { id: string; code: string; name: string }
interface Listing {
  id: string;
  channel_id: string;
  vacancy_id: string;
  inquiry_count: number;
  status: string;
  listed_at: string;
}

async function fetchData() {
  const supabase = await createClient();
  const [chRes, listingRes] = await Promise.all([
    supabase.from("ad_channels").select("id, code, name").eq("is_active", true).order("display_order"),
    supabase.from("vacancy_ad_listings").select("id, channel_id, vacancy_id, inquiry_count, status, listed_at").limit(5000),
  ]);
  return {
    channels: (chRes.data ?? []) as Channel[],
    listings: (listingRes.data ?? []) as Listing[],
  };
}

export default async function ChannelsAnalyticsPage() {
  const { channels, listings } = await fetchData();

  type Stat = { name: string; total_listings: number; active: number; contracted: number; inquiries: number; conversionRate: number };
  const stats: Stat[] = channels.map((ch) => {
    const items = listings.filter((l) => l.channel_id === ch.id);
    const total = items.length;
    const active = items.filter((i) => i.status === "active").length;
    const contracted = items.filter((i) => i.status === "contracted").length;
    const inquiries = items.reduce((s, i) => s + i.inquiry_count, 0);
    const conv = total > 0 ? Math.round((contracted * 100) / total) : 0;
    return { name: ch.name, total_listings: total, active, contracted, inquiries, conversionRate: conv };
  }).sort((a, b) => b.inquiries - a.inquiries);

  const totalInquiries = stats.reduce((s, c) => s + c.inquiries, 0);
  const totalContracts = stats.reduce((s, c) => s + c.contracted, 0);
  const topChannel = stats[0];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">광고 채널 통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          어느 플랫폼에서 문의·계약이 가장 잘 나오는지 추적합니다.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-blue-700 bg-blue-100">
              <Megaphone className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalInquiries}</p>
            <p className="text-xs text-muted-foreground mt-1">총 누적 문의</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-green-700 bg-green-100">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalContracts}</p>
            <p className="text-xs text-muted-foreground mt-1">계약 성사</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-muted-foreground">최다 문의 채널</p>
            <p className="text-xl font-bold text-primary mt-1">{topChannel?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">문의 {topChannel?.inquiries ?? 0}건</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>채널</TableHead>
                <TableHead className="text-right">등록 매물</TableHead>
                <TableHead className="text-right">노출중</TableHead>
                <TableHead className="text-right">계약 성사</TableHead>
                <TableHead className="text-right">누적 문의</TableHead>
                <TableHead className="text-right">전환율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.total_listings}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-700">{s.active}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.contracted}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold">{s.inquiries}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-xs">{s.conversionRate}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        💡 전환율 = 계약 성사 / 등록 매물. 문의 수가 많은데 전환율이 낮은 채널은 매물 설명을 보강해 보세요.
      </p>
    </div>
  );
}
