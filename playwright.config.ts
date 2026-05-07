// Playwright config for the responsive-layout audit (tests/responsive/).
// This suite is intentionally kept OUT of the default `npm test` (which
// runs Vitest unit tests) and OUT of CI. Run it manually with:
//
//   npm run test:responsive          # headless, all viewports
//   npm run test:responsive -- --ui  # interactive UI mode
//
// On first use:
//
//   npm install         # picks up @playwright/test
//   npx playwright install chromium
//
// Screenshots land in tests/responsive/screenshots/ (gitignored).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/responsive",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Boots `npm run dev` before the suite. Re-uses an already-running
  // dev server so you can keep `npm run dev` open in another terminal.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
