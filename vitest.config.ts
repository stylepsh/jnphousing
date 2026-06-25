import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // 서버 전용 라이브러리(예: survey-export)를 node 테스트에서 import 가능하게
      "server-only": path.resolve(__dirname, "./src/test/server-only-shim.ts"),
    },
  },
});
