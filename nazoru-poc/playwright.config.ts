import { defineConfig, devices } from '@playwright/test';

const port = 4322;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, locale: 'ja-JP' },
  projects: [
    { name: 'js', use: { ...devices['Desktop Chrome'] }, testIgnore: /no-js\.spec\.ts/ },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, testMatch: /no-js\.spec\.ts/ },
  ],
  webServer: {
    // exec the built Node server directly so Playwright can stop it (no orphaned preview servers).
    command: 'pnpm build && exec node dist/server/entry.mjs',
    url: `http://127.0.0.1:${port}/nagoya/`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Tests run in keyless mode by default; the key in .env is only for manual dev.
    env: { HOST: '127.0.0.1', PORT: String(port), GOOGLE_MAPS_API_KEY: process.env.E2E_GOOGLE_MAPS_API_KEY ?? '' },
  },
});
