import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    browserName: 'chromium',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'store', testMatch: '**/store.spec.js', use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'database', testMatch: '**/database.spec.js', use: { baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      env: { VITE_CATALOG_API_URL: '' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      env: { VITE_CATALOG_API_URL: '/api/products' },
      reuseExistingServer: false,
    },
  ],
});
