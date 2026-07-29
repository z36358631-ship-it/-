import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/results",
  timeout: 45_000,
  expect: { timeout: 6_000 },
  use: {
    baseURL: "http://127.0.0.1:5175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  webServer: {
    command:
      "npm.cmd run dev --workspace @gamehub/h5-monster-night-market -- --host 127.0.0.1 --port 5175",
    cwd: ".",
    url: "http://127.0.0.1:5175",
    timeout: 20_000,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium" }],
});
