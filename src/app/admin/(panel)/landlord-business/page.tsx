import { redirect } from "next/navigation";

// P2 라이트 통합: 임사자(landlord_business)는 012에서 owners로 통합됨.
// 임사자 관리 = 소유주(사업자) 관리이므로 소유주 목록으로 redirect(북마크 보존).
export default function LandlordBusinessRedirect() {
  redirect("/admin/owners");
}
