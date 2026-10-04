import { defineConfig } from "@playwright/test";
import bundled from "@sparticuz/chromium";
const useBundled = process.env.ESS_BUNDLED_CHROMIUM === "1";
export default defineConfig({
  testDir: "tests",
  testMatch: "browser-ui.spec.ts",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1280, height: 900 },
    launchOptions: useBundled
      ? {
          executablePath:
            process.env.ESS_CHROMIUM_PATH ?? (await bundled.executablePath()),
          args: bundled.args.filter(
            (arg) =>
              ![
                "--single-process",
                "--disable-web-security",
                "--allow-running-insecure-content",
              ].includes(arg),
          ),
        }
      : {},
  },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
  reporter: "list",
});
