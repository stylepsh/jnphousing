/**
 * @react-pdf/renderer 한글 폰트 등록.
 *
 * Pretendard TTF (또는 NotoSansKR) 을 `public/fonts/` 에 두고 절대 URL 로 register.
 *
 * TODO(성혁): 운영 배포 시 폰트 파일 확보 필요.
 *   - public/fonts/Pretendard-Regular.ttf
 *   - public/fonts/Pretendard-Bold.ttf
 *   - 또는 jsdelivr 같은 CDN URL 사용 가능 (Font.register({ src: 'https://...' })).
 *
 * 폰트 미등록 상태에서도 PDF 생성은 동작 (라틴만 표시). 한글은 □ 로 렌더링.
 */

import { Font } from "@react-pdf/renderer";

let registered = false;

export function ensureKoreanFonts() {
  if (registered) return;
  registered = true;

  try {
    Font.register({
      family: "Pretendard",
      fonts: [
        {
          src: process.env.NEXT_PUBLIC_PRETENDARD_REGULAR_URL
            ?? "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf",
          fontWeight: "normal",
        },
        {
          src: process.env.NEXT_PUBLIC_PRETENDARD_BOLD_URL
            ?? "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
          fontWeight: "bold",
        },
      ],
    });
    // Hyphenation 방지 (한국어는 단어 단위 끊기지 않음)
    Font.registerHyphenationCallback((word) => [word]);
  } catch (e) {
    console.warn("[pdf/fonts] 한글 폰트 등록 실패 — fallback 사용", e);
  }
}
