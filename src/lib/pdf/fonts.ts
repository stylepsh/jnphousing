/**
 * @react-pdf/renderer 한글 폰트 등록.
 *
 * OFL 라이선스의 Noto Sans KR variable TTF를 배포물에 포함해 사용한다.
 * PDF 생성이 CDN 상태에 영향을 받지 않도록 http(s) 폰트 URL은 받지 않는다.
 */

import { Font } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

let registered = false;

export function ensureKoreanFonts() {
  if (registered) return;

  const bundledFont = path.join(process.cwd(), "public", "fonts", "NotoSansKR-Variable.ttf");
  if (!fs.existsSync(bundledFont)) {
    throw new Error(`[pdf/fonts] bundled Korean font not found: ${bundledFont}`);
  }

  Font.register({
    family: "Pretendard",
    fonts: [
      { src: bundledFont, fontWeight: "normal" },
      { src: bundledFont, fontWeight: "bold" },
    ],
  });
  // 한국어를 임의 음절 단위로 쪼개지 않는다.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
