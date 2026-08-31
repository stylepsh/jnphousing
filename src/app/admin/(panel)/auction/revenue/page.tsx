import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { periodOf } from "@/lib/auction/revenue";
import { listRevenueProperties, listReceipts, monthlyTrend } from "./actions";
import { RevenueClient } from "./revenue-client";

export const metadata: Metadata = { title: "수익·정산" };
export const dynamic = "force-dynamic";

export default async function AuctionRevenuePage() {
  const period = periodOf();
  const [properties, receipts, trend] = await Promise.all([
    listRevenueProperties(),
    listReceipts(period),
    monthlyTrend(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title="수익·정산"
        accent="blue"
        desc={
          <>
            현장팀이 지급한 상품화 비용을 <strong>먼저 전액 회수</strong>한 뒤, 남는 순이익을 배분율대로
            나눕니다. 호실마다 얼마 넣어서 언제 회수되는지, 지금 배분 가능한 금액이 얼마인지 봅니다.
          </>
        }
      />
      <RevenueClient properties={properties} receipts={receipts} period={period} trend={trend} />
    </div>
  );
}
