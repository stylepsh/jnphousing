import { redirect } from "next/navigation";

// 리팩토링 ③: 임대인 → 소유주(owners) 통합. 기존 북마크 보존용 redirect.
export default function LandlordsRedirect() {
  redirect("/admin/owners");
}
