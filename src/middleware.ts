import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 인증·세션 갱신이 필요한 보호 영역에서만 미들웨어 실행.
     * (공개 홈페이지·정적 자산은 미들웨어를 거치지 않아 빠름 — 매 요청 Supabase 인증 왕복 제거)
     */
    "/admin/:path*",
    "/agency/:path*",
    "/landlord/:path*",
    "/tenant/:path*",
  ],
};
