Dark-mode UI review for `dyl-joseph/grades-unt`, integrated with main commit `fee4a8dea96103c1094efa1ebe59fd2b173b8336`. Before screenshots use the original `1fdabb59` baseline.

The landing page is centered, retains fireflies, and uses a plain Arial title with the existing sans-serif subtitles and search text. The background is flat almost-black (#08090a), with no dark-mode background gradient. Original desktop font sizes and spacing are restored, while the improved title font and compact mobile sizing are retained. Firefly colors are unchanged. Dark-mode gradients and text shimmer are removed; controls, section rows, charts, keyboard focus, and mobile semester filters are clearer. Light-mode styling and grade colors are retained.

API handlers, MCP, rate limits, encryption, shipped data, credentials, dependencies, extension source, and deployment configuration are unchanged. Verification scripts and generated JSON reports are kept outside the source PR to keep its diff focused.

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
| Comparison error | — | [Desktop](after/comparison-error-desktop.png), [Mobile](after/comparison-error-mobile.png) |
| Throttled request | [Before](before/error-mobile.png) | [After](after/error-mobile.png) |
| Empty search | [Before](before/empty-search-mobile.png) | [After](after/empty-search-mobile.png) |
| Empty saved courses | [Before](before/empty-saved-mobile.png) | [After](after/empty-saved-mobile.png) |
| Light desktop home | [Before](before/light-home-desktop.png) | [After](after/light-home-desktop.png) |
| Light mobile home | [Before](before/light-home-mobile.png) | [After](after/light-home-mobile.png) |

The directories include 52 actual Chromium screenshots, including populated comparison and saved-course views and search failures. Desktop is 1440×1000; mobile is 390×844. Additional accessibility and keyboard checks run at 320×740.

Detail views use a **synthetic six-section fixture** for ACCT 2010 and Alex Sample through the unchanged client AES-GCM/PBKDF2 decryption path. These are presentation checks, not actual UNT grades. No production data key was used. Delayed and 429/503 responses exercise loading and errors.

Actual browser measurements match the original desktop title (72px), navigation text (34px), search text (18px), search height (62px), margins, padding, and hint gaps. Mobile keeps the compact title and touch controls.

Validation: 11 CI-script tests, 150 web tests, web build, 5 extension tests, extension typecheck/build, and web TypeScript pass. Changed-file lint has zero errors; full lint retains main's 6 errors and no warnings in untouched files. 29 automated WCAG A/AA scans pass with no horizontal overflow. Secondary-text contrast is at least 7.27:1, primary labels 9.18:1, and input boundaries 3.55:1. Light home screenshots were pixel-identical to baseline with animations disabled.

Merged website fixes remain intact: stored courses survive hydration/reload, malformed stored entries are dropped, comparison failures render independently of the dropdown, empty queries show no unrelated suggestions, unknown instructors show not-found, the pre-paint theme honors system preference, and Enter-key selections are logged. Actual desktop/mobile regressions verify these behaviors.

Codex's two search findings are addressed: failed-search feedback dismisses with Escape or an outside click and reopens on focus; all suggestion options are outside the Tab sequence. Component and actual browser regressions check these behaviors, arrow-key selection, empty-popup dismissal, theme persistence, chart tooltips, semester filtering, saving/removing courses, and comparison.

To review locally, run `npm run dev -- --webpack` in `unt-grade-distribution`, switch to dark mode, and check the screenshot views at the three widths above. In search, use ArrowDown/Enter to select a suggestion, Tab to leave the input, and Escape to dismiss empty/error feedback. Disconnect the manifest request to exercise the search error. Course views require a valid existing data key.

Run `scripts/ci-local.sh`, `npm --prefix unt-grade-distribution run lint`, and `cd unt-grade-distribution && npx tsc --noEmit`. Local Prisma generation required its WASM path because the engine download domain was blocked; repository build configuration was unchanged, and GitHub CI uses the standard generation path.
