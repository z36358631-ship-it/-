import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "*.test.ts",
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "tests/**/*.test.ts",
      "tests/integration/portfolio-contract.test.mjs",
      "tests/integration/ai-playtest-evidence.test.mjs",
      "tests/integration/score-ai-playtests.test.mjs",
    ],
    exclude: [
      "tests/**/e2e/**",
      "tests/e2e/**",
      "tests/performance/**",
      "tests/**/visual/**",
    ],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
