Dark-mode UI review for `dyl-joseph/grades-unt`, based on main commit `1fdabb5948ab1f125fe5ca389c60f74331be5da3`.

Dark mode now uses neutral surfaces, readable secondary text, a restrained green accent, stable chart rendering, clear focus and selection states, and wrapped semester controls. Light-mode styles and grade colors are retained. Dark-mode sparkles, fireflies, gradients, the empty-search game, and floating support overlay have been removed from the visible interface. The support link remains in page flow. Search exposes the existing empty/error states and its keyboard-highlighted option to assistive technology.

The change is limited to app presentation, shared UI components, theme chart colors, a search accessibility regression assertion, and these review artifacts. API handlers, MCP, proxy/rate-limit enforcement, encryption code, shipped data, extension source, credentials, dependencies, and deployment configuration are unchanged.

| View | Before | After |
| --- | --- | --- |
| Desktop home | [Before](before/home-desktop.png) | [After](after/home-desktop.png) |
| Mobile home | [Before](before/home-mobile.png) | [After](after/home-mobile.png) |
| Desktop course | [Before](before/course-desktop.png) | [After](after/course-desktop.png) |
| Mobile course | [Before](before/course-mobile.png) | [After](after/course-mobile.png) |
| Desktop instructor | [Before](before/instructor-desktop.png) | [After](after/instructor-desktop.png) |
| Mobile instructor | [Before](before/instructor-mobile.png) | [After](after/instructor-mobile.png) |
| Keyboard search | [Before](before/search-keyboard-mobile.png) | [After](after/search-keyboard-mobile.png) |
| Loading | [Before](before/loading-mobile.png) | [After](after/loading-mobile.png) |
| Throttled course request | [Before](before/error-mobile.png) | [After](after/error-mobile.png) |
| No search results | [Before](before/empty-search-mobile.png) | [After](after/empty-search-mobile.png) |
| No saved courses | [Before](before/empty-saved-mobile.png) | [After](after/empty-saved-mobile.png) |
| Light desktop home | [Before](before/light-home-desktop.png) | [After](after/light-home-desktop.png) |
| Light mobile home | [Before](before/light-home-mobile.png) | [After](after/light-home-mobile.png) |

Additional screenshots cover populated comparison and saved-course pages and search failures. The full screenshot directories contain desktop and mobile variants.

The browser checks use local Chromium at 1440×1000 and 390×844. An additional accessibility/keyboard pass runs at 320×740. Searches initially use the shipped manifest. Course, instructor, comparison, and saved-course screens use a **synthetic six-section fixture** for ACCT 2010 and instructor Alex Sample. Browser-intercepted blob/metadata responses are encrypted with an explicit fixture-only key and pass through the unchanged client AES-GCM/PBKDF2 decryption and grade aggregation. The fixture does not represent actual UNT grade data. No production data key was used or changed. Delayed responses and 429/503 responses exercise loading/error presentation. External embeds and analytics are blocked during verification.

Both light-home screenshots are pixel-identical to the baseline after disabling the animated canvas and sparkle animation for a deterministic comparison. This verifies the home design; it does not claim a full-site light-mode pixel comparison.

Automated checks include WCAG 2 A/AA and WCAG 2.1 AA axe scans, viewport overflow assertions, ArrowDown/Enter/Escape search navigation, active-option relationships, visible keyboard focus, theme persistence, missing-key error recovery, chart keyboard tooltips, semester filtering, saving/removing a course, and a populated course-versus-instructor comparison. The search failure screenshot verifies that an unsuccessful manifest request produces visible feedback.

Measured contrast: secondary text is at least 7.27:1 across the neutral surfaces, primary labels are 9.18:1 against the accent, and input boundaries are 3.55:1 against the input surface. [Contrast measurements](contrast.json), [page accessibility report](accessibility.json), and [detail accessibility report](detail-accessibility.json) are included.

The repository gate passes: 11 CI-script tests, 144 web tests (including MCP, encryption, request handling, and rate limiting), web production build, 3 extension tests, and extension typecheck/build. The isolated Redis integration suite passes 2 tests. Web TypeScript checking passes. Changed-file ESLint has zero errors and the existing unused `visibleSections` warning. Full ESLint fails with the same **9 errors and 1 warning as the baseline**: three errors in the untouched encrypted demo, three in the relational CSV converter, and three in the encryptor test. These unrelated lint errors are not part of this UI change.

To reproduce without adding product dependencies:

```bash
npm install --prefix /tmp/grades-ui-tools playwright @axe-core/playwright
# Start the app in another terminal. This key is only for the synthetic fixture.
cd unt-grade-distribution
NEXT_PUBLIC_DATA_KEY=ui-fixture-only npm run dev -- --webpack
# From the repository root:
UI_TOOLS_DIR=/tmp/grades-ui-tools/node_modules CHROMIUM_PATH=/usr/bin/chromium \
  node docs/ui-dark-mode/capture.cjs after
UI_TOOLS_DIR=/tmp/grades-ui-tools/node_modules CHROMIUM_PATH=/usr/bin/chromium \
  node docs/ui-dark-mode/verify.cjs
scripts/ci-local.sh
npm --prefix unt-grade-distribution run lint
cd unt-grade-distribution && npx tsc --noEmit
```

The scripts support `UI_BASE_URL` and `UI_EVIDENCE_DIR`. Their default evidence directory is `/tmp/grades-ui-evidence`. A production-like build can run the same fixture checks if it is built with the fixture-only key. The local environment used `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true` for Prisma client generation because the schema-engine download domain was blocked; client generation uses Prisma's WASM path and the production build completed. No repository build configuration was altered for that workaround.
