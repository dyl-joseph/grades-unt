import { createCipheriv, pbkdf2Sync } from "node:crypto";
import { PNG } from "pngjs";
import { test, expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import type { EncryptedCourse } from "../src/lib/encryptedData";

const course: EncryptedCourse = {
  prefix: "CSCE", number: "1010", title: "DISCOVERING CS",
  sections: Array.from({ length: 60 }, (_, index) => ({
    sectionNumber: String(index + 1).padStart(3, "0"),
    instructor: { firstName: "Scroll", lastName: "Fixture" },
    year: index < 30 ? "2026" : "2025", term: index < 30 ? "Spring" : "Fall",
    grades: { A: 20, B: 10, C: 5, D: 2, F: 1, P: 0, NP: 0, W: 1, I: 0 },
  })),
};
const salt = Buffer.alloc(16, 1);
const iv = Buffer.alloc(12, 2);
const cipher = createCipheriv("aes-256-gcm", pbkdf2Sync("scroll-regression-fixture", salt, 1000, 32, "sha256"), iv);
const blob = Buffer.concat([cipher.update(JSON.stringify(course)), cipher.final(), cipher.getAuthTag()]);

async function expectPaintedChart(page: Page, chart: Locator, testInfo: TestInfo, name: string) {
  await expect(chart.locator(".recharts-bar-rectangle").first()).toBeVisible();
  await expect.poll(async () => {
    const bounds = await chart.boundingBox();
    const viewport = page.viewportSize();
    if (!bounds || !viewport) return 0;
    // Capture the viewport without screenshot() scrolling an element back into view.
    const image = PNG.sync.read(await page.screenshot({ path: testInfo.outputPath(`${name}.png`) }));
    const scale = image.width / viewport.width;
    let greenPixels = 0;
    for (let y = Math.max(0, Math.ceil(bounds.y * scale)); y < Math.min(image.height, (bounds.y + bounds.height) * scale); y++) {
      for (let x = Math.max(0, Math.ceil(bounds.x * scale)); x < Math.min(image.width, (bounds.x + bounds.width) * scale); x++) {
        const offset = (y * image.width + x) * 4;
        if (image.data[offset] === 34 && image.data[offset + 1] === 197 && image.data[offset + 2] === 94) greenPixels++;
      }
    }
    return greenPixels;
  }, { message: "The current viewport must paint this chart's green A bar", timeout: 10_000 }).toBeGreaterThan(100);
}

for (const colorScheme of ["dark", "light"] as const) {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`${colorScheme} ${viewport.width}: sections and charts survive deep scrolling`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
      await page.route("**/encrypted/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith("manifest.json")) {
          await route.fulfill({ json: [{ id: "scroll.bin", tokens: ["CSCE 1010", "Fixture,Scroll"], preview: course }] });
        } else if (path.endsWith(".meta.json")) {
          await route.fulfill({ json: { salt: salt.toString("base64"), iv: iv.toString("base64"), iterations: 1000 } });
        } else {
          await route.fulfill({ body: blob, contentType: "application/octet-stream" });
        }
      });
      await page.goto("/course/CSCE/1010");
      const cards = page.locator(".section-card");
      await expect(cards).toHaveCount(60);
      await expect(page.locator("body > canvas, .starfield-layer")).toHaveCount(0);
      await expectPaintedChart(page, page.locator(".recharts-wrapper").first(), testInfo, "initial");
      for (const [step, index] of [0, 29, 59, 10, 59, 0].entries()) {
        const card = cards.nth(index);
        await card.scrollIntoViewIfNeeded();
        await expect(card).toBeInViewport();
        await expectPaintedChart(page, card.locator(".recharts-wrapper"), testInfo, `scroll-${step}-section-${index}`);
        const unobscured = await card.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = Math.min(innerHeight - 10, Math.max(100, rect.top + rect.height / 2));
          return element.contains(document.elementFromPoint(x, y));
        });
        expect(unobscured).toBe(true);
      }
      const last = cards.last();
      await last.scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: /Switch to (light|dark) mode/ }).click();
      await expectPaintedChart(page, last.locator(".recharts-wrapper"), testInfo, "theme-switched-at-bottom");
      await page.getByRole("link", { name: "Support us on Ko-fi" }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("link", { name: "Support us on Ko-fi" })).toBeInViewport();
      await page.getByRole("link", { name: "UNT Grades", exact: true }).click();
      await expect(page.locator(".home-page")).toBeVisible();
      await expect(page.locator("body > canvas")).toHaveCount(1);
      await page.goBack();
      await expect(cards).toHaveCount(60);
      await expect(page.locator("body > canvas, .starfield-layer")).toHaveCount(0);
      await last.scrollIntoViewIfNeeded();
      await expectPaintedChart(page, last.locator(".recharts-wrapper"), testInfo, "returned-to-course");
    });
  }
}
