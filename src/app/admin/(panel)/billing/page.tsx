import { redirect } from "next/navigation";

// 수금·청구 통합 허브의 정식 경로. 구현은 /admin/rent (월세현황+청구일괄+입금매칭+연체).
export default function BillingRedirect() {
  redirect("/admin/rent");
}
