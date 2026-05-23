import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ENV 미설정 시 미들웨어는 통과만 — 첫 셋업 단계에서 dev 서버가 죽지 않도록.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL
    || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() 호출은 토큰 갱신을 트리거 — 반드시 호출 필요.
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const pathname = url.pathname;

  // 보호 라우트 ---------------------------------------------------------------
  // /admin/* → admin_users 등록 필요
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!user) {
      const redirectUrl = new URL("/admin/login", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    const adminRes = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!adminRes.data) {
      return NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url));
    }
  }

  // /agency/vacancies → 로그인 + approved 필요
  if (pathname.startsWith("/agency/vacancies")) {
    if (!user) {
      const redirectUrl = new URL("/agency/login", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    const agencyRes = await supabase
      .from("agencies")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    const agency = agencyRes.data as { status: string } | null;
    if (!agency || agency.status !== "approved") {
      return NextResponse.redirect(new URL("/agency/login?error=not_approved", request.url));
    }
  }

  // /agency/pending, /agency/rejected → 로그인만 요구 (본인 데이터 표시용)
  if (
    pathname === "/agency/pending"
    || pathname === "/agency/rejected"
  ) {
    if (!user) {
      return NextResponse.redirect(new URL("/agency/login", request.url));
    }
  }

  // /tenant/my-* → tenant session 쿠키 필요
  if (pathname.startsWith("/tenant/my-")) {
    const tenantToken = request.cookies.get("tenant_session")?.value;
    if (!tenantToken) {
      const url = new URL("/tenant/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    // 실제 JWT 검증은 페이지의 server component 에서 (edge runtime 호환).
  }

  return supabaseResponse;
}
