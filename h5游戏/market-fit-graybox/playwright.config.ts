import { defineConfig } from '@playwright/test';

const viewports = [
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-430x932', width: 430, height: 932 },
] as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['json', { outputFile: 'docs/evidence/v0.1/test-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    colorScheme: 'dark',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    ...viewports.map(({ name, width, height }) => ({
      name,
      grep: /@victory/,
      use: { viewport: { width, height } },
    })),
    {
      name: 'failure-mobile-390x844',
      grep: /@failure/,
      use: { viewport: { width: 390, height: 844 } },
    },
  ],
});
