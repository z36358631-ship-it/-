import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results/playwright-root",
  timeout: 45_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node tools/assets/serve-dist.mjs",
    url: "http://127.0.0.1:4173/hub/",
    timeout: 15_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Pixel 5"],
        viewport: {
          width: 390,
          height: 844,
        },
        hasTouch: true,
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["iPhone 13"],
        viewport: {
          width: 390,
          height: 844,
        },
      },
    },
  ],
});
