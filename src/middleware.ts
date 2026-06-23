import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 자산을 제외한 모든 경로에서 미들웨어 실행.
     *
     * 중요: Supabase SSR 세션은 미들웨어(쿠키 set 가능)에서만 안전하게 갱신된다.
     * 공개 페이지도 createClient()로 Supabase를 호출하므로, 미들웨어가 거기서
     * 안 돌면 만료 토큰 갱신 시 회전된 refresh_token이 Server Component에서
     * 저장되지 못해(= server.ts setAll silent catch) 세션이 풀린다.
     * (예: 로그인 후 홈/공개 페이지로 이동 → 로그인 풀림)
     * 따라서 보호 영역뿐 아니라 전 경로에서 세션을 갱신한다. 역할별 DB 체크는
     * updateSession 내부에서 pathname 으로 게이팅하므로 공개 경로는 getUser()만 수행.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)$).*)",
  ],
};
