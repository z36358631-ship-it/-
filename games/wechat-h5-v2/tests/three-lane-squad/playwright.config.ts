import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/results",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:5176",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Pixel 5"],
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  webServer: {
    command: "npm.cmd run dev -w @gamehub/h5-three-lane-squad -- --host 127.0.0.1",
    cwd: root,
    url: "http://127.0.0.1:5176/",
    timeout: 20_000,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
