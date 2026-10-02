const path = require("node:path");
const toolsDir = process.env.UI_TOOLS_DIR;
const { chromium } = require(
  toolsDir ? path.join(toolsDir, "playwright") : "playwright",
);
const AxeBuilder = require(
  toolsDir
    ? path.join(toolsDir, "@axe-core/playwright")
    : "@axe-core/playwright",
).default;
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const evidenceDir = path.resolve(
  process.env.UI_EVIDENCE_DIR || "/tmp/grades-ui-evidence",
);
fs.mkdirSync(evidenceDir, { recursive: true });
const base = process.env.UI_BASE_URL || "http://localhost:3000";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const report = [];
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/https:\/\/(?!localhost)/, (r) => r.abort());
    for (const path of [
      "/",
      "/cart",
      "/search?query=zzzznotacourse",
      "/compare",
      "/terms",
    ]) {
      await page.goto(base + path);
      await page.waitForTimeout(600);
      const layout = await page.evaluate(() => ({
        theme: document.documentElement.className,
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        bg: getComputedStyle(document.body).backgroundColor,
      }));
      assert.equal(layout.bg, "rgb(16, 20, 19)");
      assert.ok(layout.scroll <= layout.width, JSON.stringify(layout));
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.push({
        viewport,
        path,
        layout,
        violations: scan.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      });
    }
    await page.goto(base);
    const input = page.getByRole("combobox");
    await input.fill("ACCT 2010");
    await page.getByRole("option").first().waitFor();
    await input.press("ArrowDown");
    assert.equal(
      await page.getByRole("option").first().getAttribute("aria-selected"),
      "true",
    );
    assert.ok(await input.getAttribute("aria-activedescendant"));
    await input.press("Escape");
    assert.equal(await input.getAttribute("aria-expanded"), "false");
    await input.fill("zzzznotacourse");
    await page.getByRole("status").filter({ hasText: "No matching" }).waitFor();
    await input.press("Enter");
    await page.getByRole("heading", { name: "No results found" }).waitFor();
    await page.goto(base);
    await page.getByRole("combobox").press("Tab");
    await page.waitForTimeout(150);
    const focus = await page.evaluate(() => ({
      tag: document.activeElement.tagName,
      text: document.activeElement.textContent,
      outline: getComputedStyle(document.activeElement).outlineStyle,
      width: getComputedStyle(document.activeElement).outlineWidth,
      color: getComputedStyle(document.activeElement).outlineColor,
    }));
    assert.equal(focus.outline, "solid");
    assert.equal(focus.width, "2px");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("theme")),
      "light",
    );
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("theme")),
      "dark",
    );
    await page.goto(base + "/course/ACCT/2010");
    await page
      .getByText("Course data key is missing or invalid for this deployment")
      .waitFor();
    await page.getByRole("button", { name: "Go Home" }).click();
    await page.getByRole("heading", { name: "Grade Explorer" }).waitFor();
    report.push({
      viewport,
      keyboard: "ArrowDown/Enter/Escape and visible 2px focus passed",
      focus,
      themeToggle: "passed",
      unconfiguredKeyError: "passed",
      errors,
    });
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(
    path.join(evidenceDir, "accessibility.json"),
    JSON.stringify(report, null, 2),
  );
  for (const scan of report) {
    if (scan.violations) assert.deepEqual(scan.violations, [], scan.path);
    if (scan.errors) assert.deepEqual(scan.errors, []);
  }
  console.log(JSON.stringify(report));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
