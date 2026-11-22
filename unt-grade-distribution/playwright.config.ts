import { defineConfig, devices } from "@playwright/test";

const chromiumLaunchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: chromiumLaunchOptions } },
    {
      name: "chromium-retina",
      use: {
        ...devices["Desktop Chrome"], deviceScaleFactor: 2,
        launchOptions: {
          ...chromiumLaunchOptions,
          args: ["--enable-gpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        },
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    env: { NEXT_PUBLIC_DATA_KEY: "scroll-regression-fixture", DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci", DIRECT_URL: "postgresql://ci:ci@localhost:5432/ci" },
    timeout: 180_000,
  },
});
