import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // 로컬 산출물 — 제품 코드가 아니다
      "codex-handoff/**",
      "_import/**",
    ],
  },
  {
    rules: {
      // 의도적으로 안 쓰는 인자·변수는 밑줄로 표시한다 (route handler 의 _req 등)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // @react-pdf/renderer 의 <Image> 는 DOM 이미지가 아니라 alt 속성이 없다
    files: ["src/lib/pdf/**"],
    rules: { "jsx-a11y/alt-text": "off" },
  },
];

export default eslintConfig;
