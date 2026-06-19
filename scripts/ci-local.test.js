const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const script = path.join(repoRoot, "scripts", "ci-local.sh");

const expectedDryRun = [
  "+ node --test scripts/ci-local.test.js scripts/github-ci.test.js",
  "+ npm --prefix unt-grade-distribution test",
  "+ npm --prefix unt-grade-distribution run build",
  "+ npm --prefix extension run build",
].join("\n") + "\n";

function runScript(args = [], cwd = repoRoot) {
  return spawnSync("bash", [script, ...args], {
    cwd,
    encoding: "utf8",
  });
}

test("dry run lists local CI checks in execution order", () => {
  const result = runScript(["--dry-run"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, expectedDryRun);
});

test("dry run resolves from a nested working directory", () => {
  const result = runScript(["--dry-run"], path.join(repoRoot, "unt-grade-distribution"));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, expectedDryRun);
});

test("unknown arguments fail with usage", () => {
  const result = runScript(["--unknown"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage: scripts\/ci-local\.sh \[--dry-run\]/);
});

test("dry run provides default database URLs for build imports", () => {
  const result = spawnSync(
    "bash",
    [
      "-c",
      [
        "unset DATABASE_URL DIRECT_URL",
        "script_path=$1",
        "set -- --dry-run",
        'source "$script_path" >/dev/null',
        'printf "%s\\n%s\\n" "$DATABASE_URL" "$DIRECT_URL"',
      ].join("; "),
      "bash",
      script,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, [
    "postgresql://ci:ci@localhost:5432/ci",
    "postgresql://ci:ci@localhost:5432/ci",
    "",
  ].join("\n"));
});

test("script is executable for external CI helpers", () => {
  const mode = fs.statSync(script).mode;

  assert.notEqual(mode & 0o111, 0);
});
