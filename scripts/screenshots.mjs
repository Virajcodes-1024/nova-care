import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
if (existsSync(".browsers"))
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve(".browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("docs/screenshots", { recursive: true });
try {
  await page.goto("http://127.0.0.1:5173");
  await page.getByText("Scheduled today").waitFor();
  await page.screenshot({
    path: "docs/screenshots/overview.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:5173/assistant?demo=1");
  await page.getByRole("button", { name: "Send request" }).click();
  await page
    .getByText("Your plan is ready.", { exact: false })
    .first()
    .waitFor();
  await page.getByText("Explain this result").last().click();
  await page.screenshot({
    path: "docs/screenshots/assistant.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173");
  await page.getByText("Scheduled today").waitFor();
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      pageErrors: errors,
      mobileOverflow: await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth >
          globalThis.innerWidth,
      ),
    }),
  );
} finally {
  await browser.close();
}
