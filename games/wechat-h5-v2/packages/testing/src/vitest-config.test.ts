import { describe, expect, it } from "vitest";
import config from "../../../vitest.config";

describe("vitest collection boundaries", () => {
  it("never collects Playwright, performance, or visual specs", () => {
    const testConfig = config.test;
    expect(testConfig?.include).toContain("tests/**/*.test.ts");
    expect(testConfig?.exclude).toEqual(expect.arrayContaining([
      "tests/**/e2e/**",
      "tests/e2e/**",
      "tests/performance/**",
      "tests/**/visual/**",
    ]));
  });
});
