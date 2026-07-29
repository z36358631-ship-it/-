import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/results",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  webServer: {
    command:
      "npm.cmd run dev --workspace @gamehub/h5-ricochet-crew -- --host 127.0.0.1 --port 5174",
    cwd: ".",
    url: "http://127.0.0.1:5174",
    timeout: 20_000,
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium" }],
});
