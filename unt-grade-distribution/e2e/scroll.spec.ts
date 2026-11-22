import { createCipheriv, pbkdf2Sync } from "node:crypto";
import { PNG } from "pngjs";
import { test, expect } from "@playwright/test";
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
      // Keep animated viewport layers behind content without elevating the entire long page.
      await expect(page.locator("body > main")).toHaveCSS("z-index", "auto");
      for (const index of [0, 29, 59, 10, 59, 0]) {
        const card = cards.nth(index);
        await card.scrollIntoViewIfNeeded();
        await expect(card).toBeInViewport();
        await expect(card.locator(".recharts-bar-rectangle").first()).toBeVisible();
        const chart = card.locator(".recharts-wrapper");
        await expect.poll(async () => {
          const image = PNG.sync.read(await chart.screenshot());
          let greenPixels = 0;
          for (let offset = 0; offset < image.data.length; offset += 4) {
            if (image.data[offset] === 34 && image.data[offset + 1] === 197 && image.data[offset + 2] === 94) greenPixels++;
          }
          return greenPixels;
        }, { message: "The scrolled chart must actually paint its green A bar", timeout: 10_000 }).toBeGreaterThan(100);
        const unobscured = await card.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = Math.min(innerHeight - 10, Math.max(100, rect.top + rect.height / 2));
          return element.contains(document.elementFromPoint(x, y));
        });
        expect(unobscured).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`section-${index}.png`) });
      }
      await page.getByRole("link", { name: "Support us on Ko-fi" }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("link", { name: "Support us on Ko-fi" })).toBeInViewport();
    });
  }
}
