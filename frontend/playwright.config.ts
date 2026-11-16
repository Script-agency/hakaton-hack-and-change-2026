import { defineConfig } from "@playwright/test";

const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 5_000, toHaveScreenshot: { animations: "disabled", maxDiffPixels: 0 } },
  outputDir: "test-results",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  snapshotPathTemplate: "{testDir}/visual/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:4175",
    browserName: "chromium",
    headless: true,
    locale: "ru-RU",
    timezoneId: "Asia/Yekaterinburg",
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "interactive", testMatch: "interactive/**/*.spec.ts", use: { viewport: { width: 1280, height: 900 } } },
    { name: "visual-desktop", testMatch: "visual/**/*.spec.ts", use: { viewport: { width: 1280, height: 900 } } },
    { name: "visual-mobile", testMatch: "visual/**/*.spec.ts", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "node e2e/server.mjs",
    url: "http://127.0.0.1:4175/fixture.html",
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
