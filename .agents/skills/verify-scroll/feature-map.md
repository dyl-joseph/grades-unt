# Scroll verification map

| ID | User action | Preconditions | Check | Expected result | Evidence | Cleanup |
|---|---|---|---|---|---|---|
| scroll-001 | Scroll a long course down and back up | Next test server, synthetic encrypted 60-section course | `npm run test:e2e` | Sections 1, 30, 60, 11 stay in viewport and unobscured; chart screenshots contain painted A bars | Per-section screenshots and failure traces in `test-results` | Runner stops server; no data writes |
| scroll-002 | Use dark/light themes on mobile/desktop | Same fixture, animated backgrounds enabled | Same command, all three engines | Backgrounds remain behind normal-flow content; footer reachable | Four cases per browser engine | Same |
| scroll-003 | Scroll on a Mac with GPU rendering | Real macOS Safari and Chrome, working deployment data | Manual procedure in SKILL.md | No blank areas during rapid scroll, reverse scroll, and theme switch | Record browser/OS versions and screenshots | None |

Automated checks use real browser rendering with mocked network data. Native macOS verification is a separate manual check. Record executed browser projects and results in the task report; an installed test is not evidence of a passing run.
