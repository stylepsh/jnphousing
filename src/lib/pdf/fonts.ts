/**
 * @react-pdf/renderer 한글 폰트 등록.
 *
 * OFL 라이선스의 Noto Sans KR 을 배포물에 포함해 사용한다.
 * PDF 생성이 CDN 상태에 영향을 받지 않도록 http(s) 폰트 URL은 받지 않는다.
 *
 * 정적 인스턴스(Regular 400 / Bold 700)를 쓴다 — 가변 폰트(wght 100~900)를 쓰면
 * @react-pdf 가 가변축을 지원하지 않아 기본 인스턴스인 **Thin(100)** 으로 렌더된다.
 * 그래서 모든 PDF 가 얇게 나와 인쇄하면 흐릿했고, bold 도 같은 파일이라 굵기 구분이 없었다.
 */

import { Font } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

let registered = false;

export function ensureKoreanFonts() {
  if (registered) return;

  const dir = path.join(process.cwd(), "public", "fonts");
  const regular = path.join(dir, "NotoSansKR-Regular.ttf");
  const bold = path.join(dir, "NotoSansKR-Bold.ttf");
  for (const f of [regular, bold]) {
    if (!fs.existsSync(f)) throw new Error(`[pdf/fonts] bundled Korean font not found: ${f}`);
  }

  Font.register({
    family: "Pretendard",
    fonts: [
      { src: regular, fontWeight: "normal" },
      { src: bold, fontWeight: "bold" },
    ],
  });
  // 한국어를 임의 음절 단위로 쪼개지 않는다.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
