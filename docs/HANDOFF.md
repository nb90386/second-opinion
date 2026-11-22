# Second Opinion — current handoff

## Motion and interaction pass (Claude, October 31, 2026)

**Standard used.** No "review-animations" skill is installed, so I applied Impeccable's animation reference (`reference/animate.md`): motion must explain state, relationship or continuity; exits are faster than entrances; motion must be interruptible; and there must be a reduced-motion path. Context7 could not run in this sandbox (npm's cache folder isn't writable), so the `<ViewTransition share>` API was checked against the installed `@types/react` definitions instead.

**Evidence.** `artifacts/motion-pass-2026-10-31/`:
- `probe.mjs` against a production build: unexpected layout shift, frame timing during deck moves and ledger scrolling, long animation frames, event timing, frame captures. Results in `before.json`, `after.json`, `after-run2.json` and `after-run3.json`.
- `verify.mjs`: finding reveal, reading band, handoff frames.
- `before-*` and `after-*` PNGs.
- Gate output in `gate-*.txt`.

**Verified improvements.**

| What changed | Before | After | Evidence |
| --- | --- | --- | --- |
| Going back in the deck | arrived from the right | arrives from the left; forward from the right | `before/after-back-60ms-1440.png`; new regression asserts `card-in` / `card-in-back` |
| Letter follows the deck at 390 | current paragraph outside the letter's view (`letterCurrentInView: false`) | in view on all 3 after-runs; waits for a landing chip | probe; new regression |
| Review → letter | whole page faded; no link between the two letters | the letter sheet grows from its column into the paper, then a sequential crossfade | `before-handoff-200ms-1440.png`, `after-handoff-{80,220,420}ms-1440.png` |
| Opening a finding low in the margin | body opened below the visible area | body fully shown (bottom 864 in a margin ending at 892), title kept (281) | `after-expand-settled-1440.png`; new regression |
| Margin while reading the ledger | no relationship | the question for lines in the reading band is marked, and cleared off-band | `after-reading-band-1440.png`; new regression |
| Touch | browser grey tap flash on controls | tap highlight off; press states on the view switch, finding summaries and steps nav | code review; visual |
| View-switch count | appeared when the first check landed | reserved ("–") from the start | code |

Frame timing is reported as observed, not claimed as an improvement:
- **Phone at 4× CPU, deck moves:** one before-run measured p95 33.3ms with 1 frame over 50ms. Three after-runs measured 16.7–16.8ms with 0 frames over 50ms.
- **Long animation frames on the phone path:** 12 before, 4–5 after.

No rendering-performance change was made deliberately, and there is only one before-run, so this difference may be noise. Ledger scrolling held 16.7ms p95 before and after. Unexpected layout shift was ≤ 0.0001 before and 0 after. A new regression asserts that the review opens with less than 0.01 unexpected shift.

**Stability.** Animation never owns state:
- Decisions write the case first, then motion follows.
- The chip is a clone. A flight cancels on a live reduced-motion change or on unmount (verified), and is skipped when its target paragraph is off screen.
- Scroll adjustments affect only the letter container or a bounded page/margin offset, and never steal focus.
- Exports, persistence and analysis paths are untouched; their journeys pass unchanged.
- No billing-analysis code changed: `lib/` is unchanged.

**Gates (actual runs).**
- typecheck: passed.
- lint: passed, zero warnings.
- test: passed, 36/36.
- build: passed.
- test:browser: passed, now including the motion regressions in `tests/redesign-browser.mjs`.
- test:a11y: passed, 38 axe scans, zero WCAG 2.1 A/AA violations.

**Remaining limitations.**
- **Reduced motion still disables all transitions,** per the brief's acceptance criterion; it does not offer gentler, non-spatial motion.
- **The letter-sheet morph is Chromium-only** (View Transitions with types). Elsewhere the pages swap without movement.
- **The reading band is a desktop relationship.** On narrower screens the margin sits above the ledger, so its marks aren't visible while reading the ledger.
- **Chip flights are skipped when the letter is off screen,** for example on phones where the letter sits below the card. The letter still updates.
- **Not exercised:** Safari, Firefox, real touch hardware and screen readers.
- **Possible chip mismatch:** if questions have been left out on the letter page, a question chip may travel to a different-numbered row in the letter's checklist during the review → letter handoff.


## Redesign: one question at a time (Claude, October 31, 2026)

**Outcome.** I implemented the winning direction from the design lab (`design-lab/DECISION.md`) across every page: landing, start, review, findings, line and bill dialogs, letter, method, the empty states and not-found. DESIGN.md is rewritten for it.

The signature is the **question deck**: one finding at a time, with the evidence, why it was raised and why it might be fine. When you keep a question, its numbered chip flies into a live letter. The same deck with the real example bill is the landing page's demo. The whole-bill ledger and margin remain as the second view of the review page (`?view=bill`).

**Kept.** The analysis rules, CSV upload handling, API routes, privacy boundaries, storage key and schema, and letter generation are unchanged: `lib/`, `app/api/`, `public/` and `package.json` are identical to the backup. All 36 unit tests are unchanged and pass. `lib/story.ts` and its test remain, but the UI no longer uses them; they powered the retired walkthrough. Only the review's view choice was added, and it lives in the URL, not in storage.

**Evidence of the previous design.** Before any edit, I copied the full source, DESIGN.md, the docs and 35 screenshots to `artifacts/before-redesign-2026-10-31/`. The project is not tracked by git, so that copy is the rollback point. I removed `components/landing/AnnotatedBill.tsx` and `HeroExcerpt.tsx`; both are in that copy.

**Tests changed (assertions replaced, none disabled).**
- `tests/browser.mjs`:
  - **Removed:** the walkthrough and step-motion checks, along with the walkthrough itself.
  - **Added:** landing-deck checks (decisions, focus, renumbering, summary); review-deck checks (decisions persist to `setAside`, restore, *See it on the bill* hand-off and focus); and chip-flight motion checks (flies, lands, cancels on a live reduced-motion change, absent under reduced motion; one decision per touch tap).
  - **Unchanged:** the ledger, correction, marks, failure, upload, storage and letter journeys. They now open the whole-bill view first.
- `tests/redesign-browser.mjs` is rewritten for the deck: titles fit at 1440/768/390/320, the decision is reachable on every question, focus lands on the summary, the letter scrolls by keyboard, the phone dock sits at the bottom while reading, arrows move between questions, and a flight is removed when its page goes away.
- `tests/review-browser.mjs` reads the shared `.check-status` instead of `.margin-status`, and switches to the whole bill before keyboard ledger checks.

**Visual inspection.** `artifacts/redesign-2026-10-31/inspect.mjs` walks every page and key state at 1440/768/390 against a production server: landing, demo mid-flight, start, deck, flight, set aside, summary, whole bill, line drawer, bill details, letter, method and empty. Screenshots are beside it; every run reported no console errors and no overflow. The weakest three areas after the first complete pass were fixed and re-inspected:
1. **The phone's decision dock** covered a card that had just entered the bottom of the screen, offering a decision before the question could be read. It now docks only once the title reaches the upper half of the screen. Evidence: `fix-dock-top-390.png`, `fix-dock-reading-390.png`.
2. **"The biggest charge" line** ran its description into its plain name. It now reads as a statement entry with its outcome. A claim that "all checks ran" was corrected, because two checks don't run on this bill. Evidence: `fix-largest-*.png`.
3. **The checks overview** was three generic lists. Each level now shows a real question from the example, with its reason. Evidence: `fix-checks-*.png`.

Earlier fixes from the same inspection:
- the evidence bracket rendered as dashes, and is now a CSS stroke drawn with clip-path;
- the landing h1 ran to three lines, and is now two;
- two different numbers on one card were confusing, so the letter number moved to the decision line;
- duplicate facts under strips were removed;
- the phone first screen was compacted;
- header actions wrapped at 768;
- a broken CSS rule hid the phone switch label;
- the landing letter was not sticky, so a kept question had nowhere visible to land.

I added a "Saved in this browser" state, plus a second path in the empty states.

**Gates (actual runs, October 31, 2026; output in `artifacts/redesign-2026-10-31/gate-*.txt`).**
- typecheck: passed.
- lint: passed, zero warnings. `eslint.config.mjs` now also ignores `design-lab/**`, exploration prototypes that are not app code; before that addition, lint failed only on those files.
- test: passed, 36/36.
- build: passed.
- test:browser: passed.
- test:a11y: passed. 38 axe scans were recorded in `artifacts/accessibility.json`, with zero WCAG 2.1 A/AA violations.

Browser gates ran outside the sandbox with the same Playwright/axe overrides as the previous review (see below). No installs, downloads, deployments or commits.

**Not verified.**
- Safari and Firefox. The chip flight uses WAAPI, which both support, but it was only exercised in Chromium.
- Physical touch hardware, VoiceOver/NVDA narration of the deck's announcements, and native OS reduced-motion settings (Chromium emulation only).
- Performance was not re-measured after the redesign. The walkthrough it replaced was the previous layout-shift source, but no new performance claim is made.

**Risks and next actions.**
1. **Advocates who want the ledger first** can switch views, but the choice is per URL, not remembered.
2. **The demo deck repeats** the card component on the landing page, so the page is long on phones.
3. **Codex should run an independent review** of this redesign before any wider use.


## Final independent review (Codex, October 29, 2026)

**PASS after one P2 repair.** All six quality gates passed on the repaired application/test tree. The current findings and exact source locations are at the top of [REVIEW.md](REVIEW.md); the implementation notes below are historical and their unverified-review statements are superseded by this section.

The final identity is consistent across the hero, walkthrough, ledger, findings, letter and method page. The fictional arithmetic excerpt gives the first screen a product-specific demonstration; severity remains written in words. Existing billing functionality, input validation and meaningful failure/recovery behavior passed the current unit/browser journeys. No new privacy or animation-lifecycle defect was found in this review's scope.

**Verified defect and repair.** The summary's new unbroken figure rows clipped valid large amounts at 320px. Entering `-1000000.00` in Amount due made the page 327px wide; the amount ended at x326.56. Positive `$1,000,000.00` also exceeded the content gutter, without changing page width. Claude returned a no-tools CSS patch using the existing runner; Codex independently inspected, applied and verified it. `app/globals.css:546` now bounds the grid and allows the full amount to wrap below its label, retaining right alignment, sign and cents. Final amount edges are x304 with a 320px document. No value, engine, validation, storage or production letter change.

`tests/review-browser.mjs:226` adds an integrated regression for ±$1,000,000 amounts at 320/390px, including a 500-line bill with a $499,000,100 line sum. It checks full text, figure bounds, label intersections and page width. The assertion failed on the original production CSS and passed in both final browser gates. DESIGN.md documents the wrap and corrects its summary breakpoint description to match the existing 900/640px CSS.

**Verification actually run.** Initially reused the earlier test/performance evidence and reran the relevant story/parsing/API subset (15 passed) plus the focused production-browser probe. After the fix: typecheck passed; lint passed with zero warnings; unit tests passed 36/36; production build passed; browser gate passed; accessibility gate passed with 42 axe scans and zero WCAG 2.1 A/AA violations. Existing checks for correction/mark preservation, failed analysis, labeled exports, clipboard/print, storage recovery, clear failure, keyboard focus, 500-line editing, touch targets and zoom-equivalent layout remain enabled.

The focused final probe covered hero/review/method at 1440/1024/768/390/320px and reused the existing walkthrough regression for actual narration/evidence geometry, forward/reverse controls, resize, folded evidence scrolling, short-height letter access, live reduced-motion cancellation and unmount cleanup. Both static and live reduced motion show completed hero marks; no running animation remained after the live switch. No console/page errors or off-origin requests in the focused route probe. Inspected screenshots of the final hero, ordinary review, corrected large credit/charge, method, letter controls, keyboard row focus, folded EOB evidence and short window.

**Evidence.** All new review artifacts are under `artifacts/final-review/`:

- `initial.json`, `final.json`: browser measurements and before/after application fingerprints.
- `initial-amount-credit-320.png` → `final-amount-credit-320.png`; `final-amount-due-320.png`: verified defect and repair.
- `final-hero-{1440,1024,768,390,320}.png`, `final-review-{width}.png`, `final-method-{1440,320}.png`, `final-hero-live-reduced-390.png`.
- `summary-before.txt`: new regression fails on the original CSS. `globals-before.css.txt`: exact original declarations. `claude-fix.json`: successful implementation response, with no file tools.
- `typecheck.txt`, `lint.txt`, `tests.txt`, `build.txt`, `browser.txt`, `a11y.txt`, `accessibility.json`, `quality.json`: final gates and fingerprints. `.studio/quality.json` remains historical and untouched.

The gates also refresh `artifacts/verified-summary-{320,390}-{due,credit}.png`, `verified-keyboard-focus-390.png`, `verified-letter-390.png`, and `redesign-audit/after-{resize,short,questions-scrolled-320}.png`. Prior performance evidence was reused, not remeasured: `redesign-audit/performance-natural-scroll.json` records p95 16.7ms and no frames over 50ms during the earlier 1440/390px traversal (phone at 4× CPU). AnnotatedBill.tsx still matches that audit's final hash. No fresh field-performance or improvement claim is made.

**Commands.** Browser commands require approved execution outside this sandbox. No install was run.

```sh
# Initial focused tests
node --experimental-strip-types --test tests/story.test.ts tests/parsing.test.ts tests/api.test.ts
# Focused probe with an owned server started by: npm start -- --port 3298
node --experimental-strip-types artifacts/final-review/probe.mjs initial
node artifacts/final-review/summary-regression.mjs  # failed before the fix, as expected
# Final gates after repair
npm run typecheck
npm run lint
npm test
npm run build
STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright npm run test:browser
STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright npm run test:a11y
node --experimental-strip-types artifacts/final-review/probe.mjs final
```

The focused probe's initial `0px` versus `0` assertion was a setup error, corrected to a numeric comparison and preserved in `probe-assertion-setup-error.txt`. The local server owned by this review is stopped. Browser gates own/stop their servers. Current React ViewTransition docs were retrieved with Context7 (resolve then docs); no retrieval failure or dependency change.

**Limitations and three next actions.**

1. Verify Safari/Firefox, VoiceOver/NVDA and a physical phone, especially masks, native dialog focus, shared transitions and narration. Native zoom, OS motion settings and printers remain unverified.
2. Improve evidence context in short-height walkthroughs. The existing 720×450 zoom-equivalent capture (`artifacts/interaction-pass/zoom-ch6.png`) shows about one folded line at a time: reachable, but hard to compare. Desktop folded whitespace and brief badge/text overlap are secondary polish, not newly established blockers.
3. Make the browser gates portable with a reviewed Chromium version matching the locked Playwright runtime. This review verifies the installed override; it does not certify the missing default pairing.

The directory has no usable Git baseline because it is ignored by the parent repository; the review uses retained source/evidence/fingerprints and does not claim a complete historical diff. Local storage remains unencrypted; the app server processes bills in memory. Hosting logs/retention, regulatory compliance, long-duration heap behavior and licensed coding accuracy were not certified. No commits, deployment, credentials, global installation, user-config changes or Forge execution.

---

## Earlier implementation and review handoffs

## Interaction-quality pass (Claude Code, October 29, 2026)

Scope: motion, spatial continuity, focus, sticky/clipping and mobile behavior. No billing logic, validation, persistence, privacy or letter code was changed. No libraries, commits or deployment.

**How it was inspected.** A Playwright probe (`artifacts/interaction-pass/probe.mjs`, metrics in `probe-metrics.json`) ran against the production build with motion **enabled** at 1440×900, 390×844 (touch) and 320×640 (touch), plus 720×450 at 2× as the 200%-zoom equivalent of a 1440×900 window. It stepped through all eight walk-through chapters, capturing frames at roughly 120, 380 and 1100ms after each step. It recorded layout-shift entries during load, the walk-through, review and letter. It hovered, expanded and used "Show on bill" on a question, opened, edited and closed the line drawer and the bill-details dialog, tabbed through the landing, review and drawer recording each focused element's ring, and captured the review-to-letter handoff at 80, 250 and 700ms.

**Observed and found sound (no change).**
- Zero layout-shift entries at 1440, 390 and 320 on load, through all walk-through chapters, on review and on letter.
- No horizontal overflow at any probed size, including 200% zoom. No console or page errors.
- Walk-through narration always sat below the mobile pin (stage bottom 506, text top 530 at 390×844) and at the same reading line on desktop (text top 315).
- Drawer focus goes to Close on open and returns to the opening row on Escape.
- FLIP fold, letter write-down and badge travel were mid-flight in intermediate frames and settled by 700–1100ms.
- The probe flagged ledger row buttons as having no ring. That was a false positive: the ring is drawn on `.row-open::after`.

**Defects found and fixed.**
1. **Phone ledger highlight broke into stripes.** Under 720px the rows reflow into grid entries whose cells have gaps, and the per-cell highlighter painted separate yellow blocks (`before-phone-highlight.png`). The highlight now sweeps the whole entry as one mark at that width; desktop keeps the cell-by-cell sweep (`app/globals.css`, 720px block; `after-phone-highlight.png`).
2. **Sticky question margin sliced text at its edge.** When the desktop margin scrolled internally, lines were cut mid-glyph at its top edge with no cue (`before-margin-sliced.png`). Its edges now fade like the walk-through frame. Padding and negative margin keep the resting position: the margin and ledger headings both measured at y=383 after the change (`after-margin-faded.png`). Under 1100px the mask is removed with the sticky behavior.
3. **Date fields lost their focus ring mid-field.** Tabbing through "Date of service" reached the field's internal calendar button, where `:focus-visible`/`:focus` stop matching. The probe measured `outline: none` there. Date inputs now keep the ring via `:focus-within`, re-measured as `solid 2px`.

**Regression coverage added** (`tests/browser.mjs`): the highlighted row paints as one mark on the reflowed layout and per cell on the table layout (checked at 1440, 768 and 390), and the date field's ring stays solid at every Tab stop inside it. These assertions were not mutation-tested against the unfixed CSS; the before evidence is the probe measurement and screenshots above.

**Gates (observed this session, logs in `artifacts/interaction-pass/gate-*.txt`).** typecheck passed. lint passed with 0 warnings. `npm test` passed 36/36. Build passed. `test:browser` and `test:a11y` passed with `STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright`, run outside the sandbox for loopback; this includes the existing reduced-motion, 320px reflow, zoom-equivalent, touch-target and keyboard regressions. axe: 42 scans, 0 WCAG 2.1 A/AA violations.

**Remaining limitations (not fixed or not verified).**
- Native browser zoom and OS reduced-motion toggles were emulated, not exercised. No Safari/Firefox, physical touch devices or screen readers.
- At 200% zoom (720×450) the folded "6 questions" statement shows about one line at a time. Everything is reachable by scrolling the statement region, but the regroup is hard to see.
- In the line drawer on a modal `<dialog>`, Tab past the last control moves to the browser chrome (reported as `BODY`) before cycling back. This is native modal behavior; the page behind stays inert.
- The review-to-letter badge travel briefly overlaps question text mid-flight (`1440-toletter-250.png`). It is transient (settled by 700ms) and left as designed.

## Visual pass (Claude Code, October 29, 2026)

Scope: visual identity only. The engine, validation, persistence, privacy copy, letter generation and tests are unchanged. No packages, services, secrets, commits or deployment.

**Observed weaknesses.** These come from production-build screenshots at 1440×900 and 390×844 across every route and all eight walk-through chapters.
1. The first viewport had no trace of the annotated bill. It was a large serif claim on paper over a double rule, which reads as a generic template. The signature interaction began a full screen lower.
2. The app pages did not use the landing's annotation language. Levels were tinted pills with dots, and the margin summary was a row of chips. The walk-through writes the same levels as pencil notes.
3. The review header's figures were set in uppercase micro labels with "Edit bill details" floating alone under them. On phones "Questions" wrapped onto its own row.

**Changes.**
- `components/landing/HeroExcerpt.tsx` (new) and `app/page.tsx`: a live statement excerpt beside the headline. It is derived from the story's arithmetic chapter, with highlighter, ring and margin note drawn once on load. On phones it comes before the lede. The headline scale was rebalanced to share the row.
- `app/globals.css` `.tag`: levels are written as pencil marginalia (serif, level ink, leading stroke) on the review, line drawer, letter and method pages.
- `components/review/FindingsMargin.tsx`: the summary count is wrapped in `.tag-count`. The visible text changed from "2 · Numbers disagree" to "2 Numbers disagree".
- `app/globals.css` `.figures` / `.bill-head` / `.bill-tools`: the review figures are set as a statement-foot block with leaders and mono figures, and the edit action sits beside the bill's identity.
- DESIGN.md documents all three.

**Observed results (this session).** `npm run typecheck`, `npm run lint` (0 warnings), `npm test` (36/36 pass) and `npm run build` passed. `npm run test:browser` and `npm run test:a11y` passed with `STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright`, run outside the sandbox for loopback. `artifacts/accessibility.json` records 42 axe scans with 0 WCAG 2.1 A/AA violations. A separate screenshot probe found no horizontal overflow on the landing page at 1440, 768 or 390px and no console errors on any route at 1440 or 390px. A reduced-motion capture showed the finished excerpt at 50ms. Before/after screenshots are in `artifacts/visual-pass/`.

**Assumptions / not verified.** Safari/Firefox rendering of `mask-image` on the excerpt (the `-webkit-` prefix is included), physical devices, screen readers reading the excerpt list, and 320px for the new hero (the existing 320px reflow regression passed, but I did not inspect a 320px screenshot of it). No independent Codex review of this pass yet.

**Not addressed.** In the folded "6 questions" chapter, the statement frame keeps its full height, which leaves empty sheet below the totals on desktop. Remaining uppercase eyebrows (for example "EMERGENCY VISIT · SYNTHETIC EXAMPLE") were left as they were.

---

# Previous handoff after the redesign audit

October 29, 2026. The sections below this update preserve implementation history. The current independent findings, exact original source lines, reproductions, impacts, repairs and verification limits are at the top of [REVIEW.md](REVIEW.md).

## Current repair

Codex reviewed the real routes, source, tests and production browser behavior at 1440, 768, 390 and 320px, plus 640×360. Five medium-severity deficiencies were verified and repaired:

- Resize now retains the visible chapter and recomputes the statement pan after geometry/font changes.
- A named, focusable statement scroll region makes every question reachable with keyboard, wheel and touch. It is inert when covered by the letter. Landing scroll padding no longer makes focusing it change the chapter.
- Step buttons and scroll selection use the same text anchors, placing the selected explanation in the reading area.
- Short windows retain narrative space; their letter sheet scrolls and keeps an editable text area and reachable action.
- Owned FLIP animations and native smooth pan are cancelled on replacement/unmount and live reduced-motion changes; listeners and observers are removed. The original defect was finite animation overlap/retention, not a demonstrated unbounded memory leak.

Runtime changes are confined to `components/landing/AnnotatedBill.tsx` and `app/globals.css`. DESIGN.md now describes the actual native scroll pan and its browser-supplied timing. `tests/redesign-browser.mjs` extends the existing harness; both browser commands include it. All prior analysis, parsing, persistence, correction and letter-export tests remain enabled. No new packages, engine changes, commits, deployment or provisioning.

Claude repair attempts were unavailable: the restricted read-only call timed out after 300s, and the supplied-source/no-tools call timed out after 180s. Neither produced a patch or review. Codex implemented the repairs under the user's explicit instruction to fix verified defects. The required Claude repair step is recorded as unavailable rather than passed; the earlier Claude redesign remains the implementation being audited.

## Current verification

All six final gates passed: typecheck, lint (zero warnings), 36 unit tests, production build, browser journeys and 42 axe scans (zero WCAG 2.1 A/AA violations). Final results, intermediate failures and diagnostic measurements are recorded in REVIEW.md and `artifacts/redesign-audit/`. Forward/reverse chapter navigation, geometry, keyboard scrolling and reduced-motion lifecycle assertions pass. Browser commands use the cached compatible runtime:

```sh
STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright npm run test:browser
STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright npm run test:a11y
```

No browser or package download was performed. The default locked Playwright/browser pairing was not repaired or certified. Final screenshots include all routes at the four requested widths, chapter states, keyboard focus, resized evidence, the scrolled folded statement and the short viewport. Exact original failures and intermediate reflow/focus failures remain in the audit artifacts.

Final scroll-only probes followed all eight chapters forward and back correctly at 1440 and 390px (phone at 4× CPU), with sampled CLS 0, p95 frames 16.7ms and no frames over 50ms. Largest sampled phone events were 48ms in the walkthrough and 40ms in review/edit/letter interactions; one 93ms load task remains recorded. These are short Chromium diagnostics, not field INP or physical-device guarantees. See `performance-{after,natural-scroll}.json`.

Unverified: VoiceOver/NVDA, Safari/Firefox, physical touch devices, native browser zoom and OS motion controls, native print dialogs/printers, long-duration heap behavior, licensed coding accuracy and production hosting/logging/privacy controls. Browser-local storage is unencrypted, and this app's server still processes bill/CSV contents in memory. No public-production or regulatory-compliance certification is made.

---

# Historical handoff, October 29, 2026

Initial implementation: Claude Code. Independent source, engineering, security, product, accessibility and visual review: Codex. The independent findings and reproduction evidence are in [REVIEW.md](REVIEW.md); Claude's original `.studio/quality.json` is historical evidence only. Nothing was committed, deployed or provisioned.

## Current product

The original document-and-margin design is preserved. Both synthetic sample bills, CSV/manual entry, editable ledger and bill facts, deterministic findings with evidence, patient marks, set-aside questions, editable letter and copy/text/print exports remain implemented. No external rates or medical billing price comparisons exist; price alone never raises a finding. Sample exports now retain a synthetic/fictional/do-not-send banner even after editing.

Rules now use engine **2026.10-2**. Room-night checks exclude 018x leave-of-absence/room-holding charges and accept three-digit room revenue codes after a spreadsheet drops the leading zero. ED notes distinguish clinician and hospital facility coding. These distinctions were checked against CMS/ACEP/AMA sources linked in REVIEW.md.

## Independent fixes

- Serialized sample/upload/blank starts, cancelled pending requests on navigation, and checked the latest stored case before replacement. A delayed-route regression verifies lock/cancellation and unchanged storage.
- Prevented case loss on reload from long grouped finding IDs, more than 1,000 findings and edited generated letters over the old 20,000-character limit. Case bounds now match generated output; edited letters have a matching 1,000,000-character UI/storage limit. Obsolete selection IDs are pruned when toggling.
- Enforced the 500-line limit in manual entry, including a mutation guard. A user can remove a line and add its replacement at the limit.
- Preserved unsaved line corrections when marks or notes change. Hidden invalid EOB/estimate fields no longer silently block saving after a coverage change. Connected upload/address errors to the relevant controls.
- Marked stale/failed analysis on the letter screen and gated export/rebuild until analysis is current; preserved the edited draft. Aborted requests cannot publish a late success.
- Rejected malformed CSV quote suffixes, duplicate mapped headers, mismatched columns and overlong descriptions instead of changing data silently. Returned every bounded skipped-row warning. Rejected ambiguous money signs and internal digit whitespace.
- Fixed extra blank print pages, retained sample labels in all exports, and added clipboard/print regression coverage.
- Brought standalone controls to the design's 44px target, reflowed the mobile method table, wrapped long account metadata and separated mobile codes from quantities. Extended checks to 320px and long 500-line bills.
- Added confirmed **Clear saved bill** for health/personal data, with cancellation and an honest notice if storage removal is blocked. Privacy copy now distinguishes browser storage from server processing and explains shared-profile access.
- Fixed delayed modal focus restoration stealing a new focus target, and focus being stranded outside the drawer when Add a line becomes line details.

No package/lockfile changes or new dependencies. The test count grew from 24 to 33, plus regression journeys integrated into the existing browser/axe harness.

## Independent quality gates

| Command | Final result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm test` | Passed, 33 tests |
| `npm run build` | Passed |
| `npm run test:browser` | Passed with installed browser-runtime override |
| `npm run test:a11y` | Passed: 30 axe scans, zero WCAG 2.1 A/AA violations; same runtime override |

All six final runs passed; there are no remaining failing gates in the verified environment. Axe ran 30 scans with zero WCAG 2.1 A/AA violations. Desktop/tablet/mobile screenshots, 320px reflow, keyboard focus and print output were inspected. The full letter PDF has two pages; the short-letter regression has one, without blank trailing pages.

Exact logs: `artifacts/review-{typecheck,lint,tests,build}.txt`, `review-browser-run.txt`, `review-a11y-run.txt`. The initial independent failing tests/reproductions and final screenshots/PDFs are listed in REVIEW.md. `dependency-audit.json` reports zero known advisories across the locked dependency graph; only `unrs-resolver` has install-script metadata, and no install scripts were run.

Browser gates require approved execution outside this machine's sandbox (`listen EPERM` inside). Cached Chromium r1247 matches the installed Playwright alpha, not the project's Playwright 1.64.1/r1248 pairing. No browser was downloaded. Verified invocation uses:

```sh
export STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright
export STUDIO_AXE=/Users/edge/Forge/projects/forge-first-build/dashboard/node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js
npm run test:browser
npm run test:a11y
```

The browser harness owns and stops its own production server (port 3217; STUDIO_PORT overrides). Run `npm run build` before browser gates. The default runtime's missing browser is not reported as a successful verification.

## Remaining limits and next actions

- Chromium Playwright/axe and responsive CSS viewports do not attest to VoiceOver/NVDA, Safari/Firefox, physical phones/touch hardware, native browser 200%/400% zoom controls, OS print dialogs or physical printers. These remain follow-up checks. The 720×450 viewport tests the CSS layout equivalent of a 1440×900 browser at 200% zoom.
- Local storage is unencrypted and not a backup. Anyone using the browser profile can open the case until cleared. Tabs remain last-write-wins; unsaved form drafts are not collaboratively merged.
- The glossary is deliberately small. A billing specialist should check every entry against licensed current-year coding references before broader release. The app does not determine coverage, legal eligibility, fair prices or what a patient owes.
- A public deployment needs an operational/privacy review of HTTPS, infrastructure logs/retention and abuse controls before receiving real health information. The application itself is stateless on the server and calls no third party; hosting behavior was not certified.
- For portable browser verification without environment overrides, supply a reviewed Chromium build matching the locked Playwright version. No tool/package/browser installation was performed for this purpose.

## Run

```sh
npm run build
npm start   # http://127.0.0.1:3000
```

Use `npm ci` only when dependencies need installation; it was not run during this independent review. Read REVIEW.md for exact findings, sources, commands, artifacts and verification limits.

## Visual overhaul, October 29, 2026 (Claude Code)

Direction, motifs and the walk-through are documented in DESIGN.md ("Creative direction"). No dependencies, fonts, images or engine/validation/persistence/letter logic changed.

- **Landing** rewritten: new claim and copy, dotted-leader spec of supported facts, the eight-chapter annotated-statement walk-through (`components/landing/AnnotatedBill.tsx`, `lib/story.ts`), restyled limits and three ways to start. The old static excerpt and step list are gone.
- **Review**: ledger in the statement language (mono print, serif plain names, mono figures); hovering or focusing a question highlights its lines; double rule under the bill head.
- **Global**: ink primary buttons with a pencil-rule hover, highlighter token, lighter/tighter display headings, double rules opening start/method/review. Em dashes removed from interface copy.
- **Tests**: `tests/story.test.ts` (3 unit tests: walk-through derives from the engine; letter carries all questions; chapters drop out when a finding is absent). `tests/browser.mjs` drives the walk-through at 1440/768/390 by button and arrow key, checks the circled figure and note, edits and undoes the letter, scrolls back to reverse it, checks overflow and runs axe at the letter step.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm test` | Passed, 36 tests |
| `npm run build` | Passed |
| `npm run test:browser` | Passed (same runtime overrides as above, run outside the sandbox) |
| `npm run test:a11y` | Passed: 33 axe scans, zero WCAG 2.1 A/AA violations |

Screenshots: `artifacts/overhaul-*.png` (walk-through chapters at 1440/768/390, review hover), plus the harness's refreshed `landing-*`, `review-*`, `letter-*` and `verified-*` captures.

Unverified: Safari and Firefox (the `scrollend` event is used where present; a 1.2s lock is the fallback), real touch hardware, and screen-reader narration of the walk-through.

## Interaction-design pass, October 29, 2026 (Claude Code)

The motion language, choreography and reduced-motion behaviour are specified in DESIGN.md › Motion. No dependencies were added: everything uses CSS transitions and keyframes, the Web Animations API (FLIP), `::details-content`, `@starting-style`, and React 19.3's `<ViewTransition>` with Next 16.4 `transitionTypes`, following the installed Next view-transitions guide.

### What changed

- **Tokens:** every duration and easing in the stylesheet now comes from six durations and three easings named by job. The only literal left is the loading dot, which pulses only while a check is in flight.
- **Walk-through:**
  - Marks are sequenced (camera, then highlighter, then ring, then note); the fold has two beats; lines move over one another on opaque paper; returning lines fade in after the move.
  - The step label follows your direction, a pencil rule marks the chapter being shown, and names are written in reading order on their own chapter only.
  - The letter is written onto its sheet.
- **Step control robustness:** a timed scroll lock was replaced with a pending target, so a chosen step holds until the page arrives, or until wheel, touch or page-scroll keys hand control back. Taps on the step controls themselves don't count as taking over.
- **Review → letter handoff:** the header and specimen band stay still as the anchor; the work area slides by direction, and the numbered question badges travel between the review margin and the letter checklist. Start → review is tagged forward. "Questions to include" moved to the top of the letter controls so the badges land on screen.
- **Re-check feedback:** questions created by your edit are highlighted and announced; the status line counts what was resolved and what's new; the Questions figure acknowledges a change.
- **Disclosures and dialogs:** disclosures animate open and closed; dialogs now have exit animations; the ledger highlight lingers off slowly.
- **Touch:** hover styles are gated behind `(hover: hover)`, `:active` feedback was added, and `touch-action: manipulation` is set on controls.
- **Layout stability:** see DESIGN.md › Layout stability.

### Measured (Chromium; `artifacts/motion-measurements.json`)

| Measure | Before | After |
| --- | --- | --- |
| Review reload layout shift, 1440 / 390 @4× CPU | 0.094 / 0.273 | 0.007 / 0 |
| Letter load layout shift, 1440 / 390 @4× CPU | 0.113 / 0.208 | 0.016 / 0.054 |
| Landing load layout shift | 0 / 0 | 0 / 0 |
| Walk-through scroll: p95 frame, frames > 50ms, long tasks | 16.8ms, 0, none | 16.7–16.8ms, 0, none (both widths) |
| Worst interaction latency at 390 @4× CPU (Event Timing) | not measured | 72ms (walk-through Next); 24–48ms for expand, Show on bill, drawer open/close, mark, review → letter, toggle |

Walk-through layout shift remains 0.079 (1440) and 0.21 (390 @4×). It comes from the statement reorganizing as you scroll: notes insert and lines fold. Each change is animated (FLIP plus camera), but the layout-shift API counts any position change that isn't caused by a discrete input, and scroll isn't one. The same changes made with the step buttons are excluded as input-driven. Removing this would mean positioning every statement line absolutely with transforms only; I judged that not worth the complexity for this pass.

### Verification

- Interactions were filmed frame by frame at 1440 and 390: fold, unfold, letter step, question expand, mark-as-not-received re-check, review → letter and back. Selected frames are in `artifacts/motion-*.png`.
- Filming found and fixed four problems:
  - Crossing lines overlapped as see-through text during the regroup.
  - Equal stacking hid the farthest-moving line.
  - Names re-ran their writing animation on every unfold.
  - The "new" and changed-count highlights ran past the text.
- A first filmed sequence suggested the step could flicker during long smooth scrolls. Part of that was Playwright's own locator click/tap scrolling a sticky control to its unstuck position, which no person does. Probes and regressions now press the control at its on-screen coordinates. A per-frame sample confirmed the stage stays pinned throughout.
- **New regressions in `tests/browser.mjs`:**
  - With motion on at 1440, six Next presses produce exactly six chapter changes in order, and the fold shows its fade beat before the regroup.
  - With touch at 390, rapid taps during a smooth scroll each advance one step.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm test` | Passed, 36 tests |
| `npm run build` | Passed |
| `npm run test:browser` | Passed (runtime overrides as above, outside the sandbox) |
| `npm run test:a11y` | Passed: 33 axe scans, zero WCAG 2.1 A/AA violations |

### Not verified

- Safari and Firefox. React notes some view-transition animations differ in Safari; `::details-content` and `interpolate-size` are Chromium-only today, and elsewhere disclosures toggle instantly. Without view-transition support, pages swap normally.
- Real touch hardware and screen-reader narration of the new status text.
- Native OS reduced-motion settings were exercised only through Chromium's emulation.
