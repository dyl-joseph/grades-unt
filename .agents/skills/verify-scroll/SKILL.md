---
name: verify-scroll
description: Verify long course pages remain painted while scrolling, including Safari/WebKit, after layout, background, theme, or chart changes.
---

Run from the repository root with Node 22 and web dependencies installed.

1. Run `scripts/ci-local.sh` for unit tests and production builds.
2. In `unt-grade-distribution`, run `npx playwright install --with-deps chromium firefox webkit`, then `npm run test:e2e`. The runner builds production code with a fixture key, then starts and stops its own Next server on port 3100. Allow three minutes for the build. Keep that port free. An installed Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`; use `-- --project=chromium` for that limited check.
3. Inspect `unt-grade-distribution/test-results` screenshots, especially the final section in dark mode. On failure inspect the retained Playwright trace. The suite checks chart pixels in full viewport captures, viewport placement, hit testing, theme changes at the bottom, and navigation away and back with 60 fixture sections in both themes at desktop and mobile sizes. Chromium also runs at 2x pixel density with GPU compositing enabled through SwiftShader. Long data pages must have no fixed animated canvas or SVG background; the homepage retains those decorations.
4. For native Mac verification, open a real course in Safari and Chrome. Scroll slowly and rapidly to the final section, back to the top, switch themes, and repeat. Confirm section text and bars stay painted and the footer is reachable. Linux browser coverage, including SwiftShader, does not prove native macOS GPU behavior. A report that it works on an external monitor but fails on a laptop display requires checking both displays before calling the issue resolved.

The browser suite intercepts encrypted data requests with a synthetic encrypted course, exercises the real decrypt/render/chart path, and needs no production key or database. It does not verify production data availability. Do not weaken pixel or visibility checks to hide a rendering failure. Report unavailable browser engines as unverified.

See [feature-map.md](feature-map.md). Test output is ignored by Git; remove only this suite's generated output when cleanup is needed.
