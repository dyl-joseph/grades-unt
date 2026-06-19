const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

test("GitHub CI runs for pull requests into main", () => {
  assert.match(workflow, /^on:\n  pull_request:\n    branches:\n      - main/m);
  assert.doesNotMatch(workflow, /pull_request_target:/);
  assert.doesNotMatch(workflow, /^\s+paths(-ignore)?:/m);
});

test("GitHub CI uses read-only repository permissions", () => {
  assert.match(workflow, /^permissions:\n  contents: read/m);
});

test("GitHub CI installs both package lockfiles before running the local gate", () => {
  assert.match(workflow, /cache-dependency-path:\s*\|\n\s+unt-grade-distribution\/package-lock\.json\n\s+extension\/package-lock\.json/);
  assert.match(workflow, /run: npm ci --prefix unt-grade-distribution/);
  assert.match(workflow, /run: npm ci --prefix extension/);
  assert.match(workflow, /run: scripts\/ci-local\.sh/);
});

test("GitHub CI builds without Vercel production secrets", () => {
  assert.match(workflow, /DATABASE_URL: postgresql:\/\/ci:ci@localhost:5432\/ci/);
  assert.match(workflow, /DIRECT_URL: postgresql:\/\/ci:ci@localhost:5432\/ci/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\.(VERCEL|DATABASE|DIRECT)_/);
});

test("GitHub CI uses maintained GitHub Actions", () => {
  assert.match(workflow, /uses: actions\/checkout@v4/);
  assert.match(workflow, /uses: actions\/setup-node@v4/);
  assert.match(workflow, /node-version: 22/);
});
