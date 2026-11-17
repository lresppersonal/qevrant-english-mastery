import { defineConfig, devices } from "@playwright/test";

/**
 * Account and persistence tests against a REAL Supabase backend (database, auth, row-level security).
 * Start it with `npx supabase start` (uses supabase/config.toml and supabase/migrations), build the app
 * into .next-sb with the local keys (see docs/LAUNCH-GUIDE.md §9), then run:
 *   npx playwright test -c playwright.supabase.config.ts
 * Confirmation and reset emails are read from the local Mailpit inbox.
 */
const chrome = process.env.PW_CHROME_PATH;
export default defineConfig({
  testDir: "e2e",
  testMatch: /accounts\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3200", trace: "retain-on-failure", launchOptions: chrome ? { executablePath: chrome } : {} },
  projects: [{ name: "supabase", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } }],
  webServer: [
    { command: "node e2e/mock-anthropic.mjs", port: 4010, reuseExistingServer: true },
    { command: "node e2e/mock-dictionary.mjs", port: 4011, reuseExistingServer: true },
    {
      command: "npx next start -p 3200", port: 3200, reuseExistingServer: true,
      env: { NEXT_DIST_DIR: ".next-sb", ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: "http://localhost:4010", AI_MAX_RETRIES: "0", DICTIONARY_API_BASE: "http://localhost:4011/api/v2/entries/en", NEXT_TELEMETRY_DISABLED: "1" },
    },
  ],
});
