const path = require("node:path");
const toolsDir = process.env.UI_TOOLS_DIR;
const { chromium } = require(
  toolsDir ? path.join(toolsDir, "playwright") : "playwright",
);
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const AxeBuilder = require(
  toolsDir
    ? path.join(toolsDir, "@axe-core/playwright")
    : "@axe-core/playwright",
).default;
const scans = [];
const output = process.argv[2] || "after";
const evidenceDir = path.resolve(
  process.env.UI_EVIDENCE_DIR || "/tmp/grades-ui-evidence",
);
fs.mkdirSync(path.join(evidenceDir, output), { recursive: true });
const base = process.env.UI_BASE_URL || "http://localhost:3000";
const course = {
  prefix: "ACCT",
  number: "2010",
  title: "Principles of Accounting I",
  sections: Array.from({ length: 6 }, (_, i) => ({
    sectionNumber: String(i + 1).padStart(3, "0"),
    year: i < 3 ? "2025" : "2024",
    term: i < 3 ? "Fall" : "Spring",
    instructor: { firstName: "Alex", lastName: "Sample" },
    grades: { A: 20 + i * 3, B: 15, C: 8, D: 3, F: 2, P: 0, NP: 0, W: 3, I: 0 },
  })),
};
const salt = Buffer.alloc(16, 4),
  iv = Buffer.alloc(12, 9),
  iterations = 1000;
const key = crypto.pbkdf2Sync(
  "ui-fixture-only",
  salt,
  iterations,
  32,
  "sha256",
);
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const blob = Buffer.concat([
  cipher.update(JSON.stringify(course)),
  cipher.final(),
  cipher.getAuthTag(),
]);
const meta = {
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  iterations,
};
const manifest = [
  {
    id: "ui-fixture.bin",
    tokens: ["acct2010", "Principles of Accounting I", "Sample,Alex"],
    preview: {
      prefix: course.prefix,
      number: course.number,
      title: course.title,
    },
  },
];
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const errors = [];
  for (const [device, viewport] of Object.entries({
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
  })) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      if (window.top === window) localStorage.setItem("theme", "dark");
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/https:\/\/(?!localhost)/, (r) => r.abort());
    await page.goto(base);
    await page.getByRole("heading", { name: "Grade Explorer" }).waitFor();
    await page.waitForTimeout(600);
    const shot = async (name, fullPage = false) => {
      if (
        output === "after" &&
        [
          "search",
          "course",
          "instructor",
          "error",
          "compare",
          "saved-course",
        ].includes(name)
      ) {
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(
          layout.scroll <= layout.width,
          `${name} overflows at ${device}: ${layout.scroll}`,
        );
        scans.push({
          device,
          name,
          layout,
          violations: scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        });
      }
      await page.screenshot({
        path: `${evidenceDir}/${output}/${name}-${device}.png`,
        fullPage,
      });
    };
    await shot("home");
    const input = page.getByPlaceholder(
      "Search course, professor, or class code...",
    );
    await input.fill("ACCT 2010");
    await page
      .locator("button, [role=option]")
      .filter({ hasText: "ACCT 2010" })
      .first()
      .waitFor();
    await shot("search");
    await input.press("ArrowDown");
    await shot("search-keyboard");
    await page.route("**/encrypted/manifest.json", (r) =>
      r.fulfill({ json: manifest }),
    );
    await page.route("**/encrypted/blobs/ui-fixture.bin", (r) =>
      r.fulfill({ body: blob, contentType: "application/octet-stream" }),
    );
    await page.route("**/encrypted/blobs/ui-fixture.meta.json", (r) =>
      r.fulfill({ json: meta }),
    );
    await page.goto(base + "/course/ACCT/2010");
    await page
      .getByRole("heading", { name: "Grade Distribution", exact: true })
      .waitFor();
    for (const panel of await page.locator(".grid > .min-w-0").all()) {
      await panel.scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("course", true);
    if (output === "after") {
      const chart = page.locator(".recharts-surface").first();
      await chart.focus();
      await chart.press("ArrowRight");
      await page.getByText(/Count:/).waitFor();
      await chart.press("Escape");
      const semester = page.locator("#course-distribution-semester");
      await semester.getByLabel("Fall 2025", { exact: true }).uncheck();
      assert.match(await semester.locator("../..").innerText(), /1 selected/);
      await semester.getByLabel("All semesters", { exact: true }).check();
      await page.getByRole("button", { name: "Save bookmark" }).click();
      assert.ok(
        await page
          .getByRole("link", { name: "Saved courses with 1 items" })
          .isVisible(),
      );
      await page
        .getByRole("link", { name: "Saved courses with 1 items" })
        .click();
      await page
        .getByRole("heading", { name: "Saved Courses", exact: true })
        .waitFor();
      await page.waitForTimeout(1800);
      await shot("saved-course");
      await page.getByRole("button", { name: "Remove saved course" }).click();
      await page
        .getByRole("heading", { name: "No saved courses yet" })
        .waitFor();
      await page.goto(base + "/compare?type=course&a=ACCT:2010");
      await page.locator(".compare-page .recharts-surface").first().waitFor();
      await page.getByPlaceholder("Search professor name").fill("Sample");
      const suggestion = page
        .locator(".compare-page section")
        .last()
        .locator("button")
        .filter({ hasText: "Sample" })
        .first();
      await suggestion.waitFor();
      await suggestion.click();
      await page.locator(".compare-page .recharts-surface").nth(1).waitFor();
      await page.waitForTimeout(1800);
      await shot("compare", true);
    }

    await page.goto(base + "/instructor/Sample%2CAlex");
    await page
      .getByRole("heading", { name: "Grade Distribution", exact: true })
      .waitFor();
    for (const panel of await page.locator(".grid > .min-w-0").all()) {
      await panel.scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("instructor", true);
    await page.goto(base + "/cart");
    await page.getByRole("heading", { name: "No saved courses yet" }).waitFor();
    await shot("empty-saved");
    await page.goto(base + "/search?query=zzzznotacourse");
    await page.getByRole("heading", { name: "No results found" }).waitFor();
    await shot("empty-search");
    await page.goto(base + "/course/NOPE/0000");
    await page.getByText("Course not found", { exact: true }).waitFor();
    await shot("not-found");
    await page.route("**/encrypted/blobs/ui-fixture.bin", (r) =>
      r.fulfill({
        status: 429,
        headers: { "Retry-After": "30" },
        body: "Too many requests",
      }),
    );
    await page.goto(base + "/course/ACCT/2010");
    await page.getByText(/Too many course data requests/).waitFor();
    await shot("error");
    await page.route("**/encrypted/blobs/ui-fixture.bin", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await r.fulfill({ body: blob, contentType: "application/octet-stream" });
    });
    await page.goto(base + "/course/ACCT/2010");
    await page.locator('[aria-busy="true"]').waitFor();
    await shot("loading");
    await page
      .getByRole("heading", { name: "Grade Distribution", exact: true })
      .waitFor();
    await context.close();
    if (output === "after") {
      const failure = await browser.newContext({
        viewport,
        reducedMotion: "reduce",
      });
      await failure.addInitScript(() => {
        try {
          localStorage.setItem("theme", "dark");
        } catch {}
      });
      const failurePage = await failure.newPage();
      await failurePage.route("**/encrypted/manifest.json", (r) =>
        r.fulfill({ status: 503, body: "Fixture unavailable" }),
      );
      await failurePage.goto(base);
      await failurePage
        .getByRole("button", { name: "Switch to light mode" })
        .waitFor();
      await failurePage.waitForTimeout(600);
      await failurePage.getByRole("combobox").fill("ACCT");
      await failurePage.getByRole("alert").waitFor();
      await failurePage.screenshot({
        path: `${evidenceDir}/${output}/search-error-${device}.png`,
      });
      await failure.close();
    }
  }
  fs.writeFileSync(
    `${evidenceDir}/${output}/browser-errors.json`,
    JSON.stringify(errors, null, 2),
  );
  fs.writeFileSync(
    `${evidenceDir}/${output}/detail-accessibility.json`,
    JSON.stringify(scans, null, 2),
  );
  await browser.close();
  assert.deepEqual(errors, []);
  if (output === "after")
    for (const scan of scans)
      assert.deepEqual(scan.violations, [], `${scan.device} ${scan.name}`);
  console.log(JSON.stringify({ output, errors, scans }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
