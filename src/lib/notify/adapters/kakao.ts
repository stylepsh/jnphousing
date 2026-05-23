/**
 * 카카오톡 알림톡 (비즈메시지) 어댑터 — 인터페이스만.
 *
 * TODO(성혁): 실제 발송 구현은 부장님 비즈메시지 사업자 인증 + API 키 확보 후.
 * 사업자 인증: 카카오비즈니스 → 알림톡 발신프로필 등록 → 템플릿 사전 승인 필수.
 *
 * 환경변수:
 * - KAKAO_BIZMSG_API_URL
 * - KAKAO_BIZMSG_API_KEY
 * - KAKAO_BIZMSG_PROFILE_KEY (발신프로필 키)
 *
 * 현재는 NotImplemented 응답.
 */

export async function kakaoAdapter(input: { recipient: string; subject: string; body: string }) {
  const apiUrl = process.env.KAKAO_BIZMSG_API_URL;
  const apiKey = process.env.KAKAO_BIZMSG_API_KEY;
  const profileKey = process.env.KAKAO_BIZMSG_PROFILE_KEY;

  if (!apiUrl || !apiKey || !profileKey) {
    console.warn("[kakaoAdapter] 환경변수 미설정 — 발송 스킵", { recipient: input.recipient });
    return { ok: false as const, error: "kakao_not_configured" };
  }

  // TODO(성혁): 실제 비즈메시지 API 호출
  // const res = await fetch(apiUrl, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
  //   body: JSON.stringify({
  //     profileKey,
  //     to: input.recipient,
  //     templateCode: ???,
  //     content: input.body,
  //   }),
  // });
  // if (!res.ok) return { ok: false, error: `kakao_${res.status}` };
  // return { ok: true };

  console.warn("[kakaoAdapter] 실제 호출 미구현 (스텁). recipient=", input.recipient);
  return { ok: false as const, error: "kakao_stub_not_implemented" };
}
