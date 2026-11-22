# Second Opinion — final independent visual review

October 29, 2026, Codex. **Assessment: PASS after repair of one P2 defect.** This supersedes the earlier audit below. No remaining verified blocker was found within the local Chromium review scope. Cross-browser, assistive-technology and production privacy certification are not implied.

## Scope and baseline

Read DESIGN.md, BRIEF.md, REVIEW.md and HANDOFF.md; inspected the actual hero, walkthrough, story data, shared tags, review figures/margin, ledger, page transitions and global CSS, plus the affected browser assertions. Rechecked the input/analysis/storage/export boundaries against the existing tests without repeating the earlier architecture review. The project is ignored by the parent Git repository, so there is no trustworthy Git diff for this directory. Used the retained pre-repair CSS/source, the documented final-pass scope and the earlier audit's SHA-256 fingerprints instead; no claim of a complete historical diff is made.

`AnnotatedBill.tsx`, package.json and package-lock.json match the earlier independent audit's final fingerprints. The later CSS changes and HeroExcerpt were inspected directly. Before/after fingerprints from this review are in `artifacts/final-review/{initial,final}.json`; of the fingerprinted application files, only globals.css changed during this review. Billing, parsing, persistence, validation and production letter code were not edited.

Initially reused the retained six-gate results, 42 axe scans, screenshots and performance evidence. Reran only the relevant story/parsing/API tests (15 passed) and a focused production-browser probe before repair. After repair, ran all six gates against the final application/test tree.

## Verified defect F1 — P2 / medium, fixed

**Exact source:** `app/globals.css:546` (intrinsically sized grid), `:547` (nonwrapping figure row), `:548` (label/leader sizing), `:550` (unbroken amount). The pre-fix declarations and their original line numbers are retained in `artifacts/final-review/globals-before.css.txt`.

**Reproduction:** at 320×900, open the emergency example → Edit bill details → enter `-1000000.00` in Amount due → Save details. This is accepted by the bill schema. The formatted `-$1,000,000.00` ends at x326.56, beyond both the x304 content edge and the 320px viewport; the document becomes 327px wide. Positive `1000000.00` also ends past the gutter, at x312.64, although document width remains 320px. The prior page-width assertion therefore missed part of the defect.

**User impact:** the redesigned summary clips cents on a valid large credit balance and introduces horizontal scrolling on a narrow phone or equivalent zoomed viewport. The saved amount remains correct; this is a presentation defect, not evidence of billing corruption. At ordinary sample amounts, both layouts fit.

**Fix:** Claude supplied a no-tools CSS patch through the existing runner; Codex inspected and applied it independently. The grid uses a bounded track, rows wrap when needed, label sizing accounts for its leader and the complete amount stays right aligned on a following line. No truncation, overflow hiding, font shrinking or amount-validation change. Implementation response: `artifacts/final-review/claude-fix.json` (completed, model reported as `claude-opus-5-5`). DESIGN.md now describes the wrap and the actual 900/640px summary breakpoints.

**Retest:** the new `summaryReflowChecks` at `tests/review-browser.mjs:226` fails on the original production CSS (`summary-before.txt`, clipped positive amount). It now passes in both full browser gates, with ±$1,000,000 due and a 500-line bill whose sum is $499,000,100, at 320 and 390px. It checks complete formatted text, every figure's bounds, label/amount intersections and document width; it restores the original amount afterward. The independent final probe also confirms both 320px amounts end at x304 and the document stays 320px wide. Before/after screenshots: `initial-amount-credit-320.png`, `final-amount-credit-320.png`, `final-amount-due-320.png`; all under `artifacts/final-review/`. Large-bill captures: `artifacts/verified-summary-{320,390}-{due,credit}.png`.

## Assessment by requested area

- **Originality and consistency — pass.** The hero now demonstrates the product before explaining it: actual statement arithmetic, highlighter, pencil ring and a specific note, explicitly fictional. Machine-print charges and serif annotations carry through review, line details, letter and method. Severity remains written in words. The shared margin tags and statement-style figures are coherent; no generic card grid, glass, stock imagery or new dependency. Inspected the hero at 1440/1024/768/390/320px and final review/method captures, plus the current letter, focus and walkthrough screenshots.
- **Scroll correctness and performance — pass within measured scope.** The existing targeted `redesignBrowserChecks` passed before and after this repair: forward/reverse controls, actual evidence/narration geometry, resize preservation, scrollable folded evidence, short-height letter access, live WAAPI cancellation and unmount cleanup. Scroll handling is passive and rAF-throttled; animations, timers, observers and listeners have cleanup. Reused the earlier scroll-only measurements (1440 and 390px, phone at 4× CPU): p95 frames 16.7ms, no sampled frames over 50ms, no long tasks during that traversal. These are historical local diagnostics, not fresh measurements, field INP or a speed-improvement claim. The hero adds finite load-time marks, not ongoing scroll work; no new performance defect was established.
- **Accessibility, keyboard and reduced motion — pass for exercised controls.** Skip link, step arrows/arrow keys, polite step status, focusable statement region, disclosure, drawer focus/return and date-field focus regressions passed. Covered statement/letter content is inert. Static reduced motion shows the hero's completed marks at all five widths; switching preference during its animation leaves zero running animations, an unclipped note and a finished ring. Existing live FLIP/unmount tests passed. The full suite also retains the 44px standalone-action target checks. Axe is supporting evidence, not a screen-reader audit.
- **Mobile, clipping and touch targets — pass after F1.** Final hero/review/method probes fit all five widths without page overflow; walkthrough evidence stays keyboard-scrollable at 320px and short windows. Inspected the final narrow credit/charge images, keyboard ledger focus, folded EOB evidence and 640×360 narration. Emulated-touch and zoom-equivalent checks passed. Short-height regrouping still has limited context, as noted below.
- **Billing preservation — pass.** All 36 unit tests and full browser journeys passed: both samples, CSV/manual entry, corrections/marks, set-aside, failed recheck/retry, reload, letter selection/editing and copy/text/print exports. The new summary regression exercises valid amounts through the real form and retains the original amount. No business-rule, request, persistence or letter-generation change was needed.
- **Privacy, validation and errors — no new defect found.** Source retains strict/bounded JSON and CSV validation, specific upload errors, stale-analysis notices/export gating, corrupt/blocked-storage handling and honest clear failure. Current unit/browser checks exercise these paths. No new raw-HTML sink, bill-content logging, external model request or third-party browser request was introduced; the focused route probe recorded no off-origin requests or console/page errors. Bill processing still uses this app's server, and browser storage remains unencrypted. Hosting retention/logging was not assessed.

Current React ViewTransition guidance was fetched through Context7 (library resolution, then `/reactjs/react.dev` docs): named shared transitions and explicit reduced-motion CSS. No quota or retrieval failure occurred. The application has the required media-query overrides; this review did not change transition APIs.

## Final gates and inspectable evidence

| Command | Result | Evidence under `artifacts/final-review/` |
| --- | --- | --- |
| `npm run typecheck` | Passed | `typecheck.txt` |
| `npm run lint` | Passed, zero warnings | `lint.txt` |
| `npm test` | Passed, 36 tests | `tests.txt` |
| `npm run build` | Passed | `build.txt` |
| `npm run test:browser` | Passed, includes F1 regression | `browser.txt` |
| `npm run test:a11y` | Passed, 42 axe scans, zero WCAG 2.1 A/AA violations; includes F1 regression | `a11y.txt`, `accessibility.json` |

Browser gates use `STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright`, outside the sandbox, with installed axe-core and owned loopback servers. No package/browser download or default-runtime repair. The probe command is `node --experimental-strip-types artifacts/final-review/probe.mjs final` with an owned production server on port 3298. A probe setup assertion initially compared computed `0px` against `0`; it was corrected to compare the numeric value and retained in `probe-assertion-setup-error.txt`. It was not an application failure or passed check.

All six final process exits were 0. `artifacts/final-review/quality.json` records the commands and final source/test/document fingerprints; `accessibility.json` preserves this run's 42 scans separately from the harness's shared output. The local server owned by this review was stopped afterward; browser gates stop their own servers.

Screenshots and measurements: `artifacts/final-review/{initial,final}.json`, `{initial,final}-hero-{1440,1024,768,390,320}.png`, `{initial,final}-review-{width}.png`, `final-hero-live-reduced-390.png`, `final-method-{1440,320}.png`; full gate captures include `artifacts/verified-keyboard-focus-390.png`, `verified-letter-390.png` and `redesign-audit/after-{questions-scrolled-320,short,resize}.png`. Existing historical performance evidence remains in `redesign-audit/performance-natural-scroll.json` and `performance-after.json`. Artifacts are intentionally ignored by Git.

## Three most important remaining improvements

1. **Verify the complete journey with Safari/Firefox, VoiceOver/NVDA and a physical phone.** Native dialog focus, shared transitions, masks and narration need independent platform evidence. Current passes are Chromium/axe/emulation only.
2. **Improve the short-height walkthrough's evidence context.** At the retained 720×450 zoom-equivalent capture (`artifacts/interaction-pass/zoom-ch6.png`), the folded statement shows roughly one line at a time. Content is reachable, but the regrouping is hard to compare. Preserve narrative space and keyboard access while making that explanation easier to follow; desktop folded whitespace and transient badge overlap are secondary polish.
3. **Make browser verification portable.** Supply a reviewed browser matching the locked Playwright runtime so all six commands work without a machine-specific override. The existing cached alpha-runtime path is verified here; the default locked pairing is not certified.

Native browser zoom, OS motion toggles, screen readers, Safari/Firefox, physical touch, printers, long-duration heap behavior, licensed coding-reference accuracy and production infrastructure privacy remain unverified. No commits, deployment, credentials, global installation, user-config change or Forge execution.

---

# Previous production audit after the visual redesign

October 29, 2026. This section is the current audit; the previous review below is historical. Findings come from source inspection and independent Chromium runs of the production build, not Claude's handoff or measurements. No dependencies, commits, deployment, service provisioning, secrets or Forge execution.

## Scope and evidence

Inspected every application page (`/`, `/start`, `/review`, `/letter`, `/method`, and the not-found page), all five API route handlers, all component/library source and tests, configuration, DESIGN.md, BRIEF.md, REVIEW.md and HANDOFF.md. Browser evidence covers 1440, 768, 390 and 320 CSS pixels; an additional 640×360 viewport exposes the short-height case. Used fresh synthetic cases and an owned local production server. All routes fit the requested widths before repair; this did not prove that content inside the walkthrough's clipping frame was reachable.

Before evidence is retained under `artifacts/redesign-audit/`: `before.json`, `probes-before.json`, `probe-replay.txt`, `regression-before.txt`, `performance-before.json`, `before-*.png`, and copies of responsible source in `source-before/`. The existing full browser suite passed before repair while the added resize regression failed. Its walkthrough checks mostly asserted chapter state, so they missed evidence visibility and animation lifetimes.

## Five verified deficiencies

All five are **P2 / medium**: the learning journey is impaired, with the working example-review path as a workaround. No critical data-loss or privacy defect was established by this redesign audit. Line numbers below identify the pre-repair source retained in `source-before/`.

1. **Resizing loses the line being explained.** `components/landing/AnnotatedBill.tsx:126` (layout effect; dependency list at line 160). Reproduction: advance to the arithmetic chapter at 1440×900, then resize to 390×844 without changing chapters. The frame is y=70–506, but the highlighted row is y=545–648; the camera retains `translateY(-516px)`. Impact: the title promises an arithmetic explanation while the relevant amount and note are invisible. Proposed repair: recompute the pan after frame geometry and font changes, without requiring another chapter selection. Evidence: `before-resize.png`, `probes-before.json`.

2. **The folded statement hides its first question with no way to reach it.** `app/globals.css:283` and `components/landing/AnnotatedBill.tsx:157`. Reproduction: advance to “6 questions, in order” at 390×900. The footer containing question 1 runs y=488–601 while the frame ends at y=540; at 320px it runs y=524–679. The fixed camera chooses the first target and `overflow: hidden` prevents reading the rest. Impact: the EOB discrepancy disappears from the purported complete question view. Proposed repair: keep automatic pan, but make the whole statement a named, focusable scroll region that supports keyboard, wheel and touch; make it inert when the letter covers it. Evidence: `before-step-6-{390,320}.png`, `before.json`.

3. **Step navigation lands the explanation below the reading area.** `components/landing/AnnotatedBill.tsx:81` and `:120`; `app/globals.css:248` limits the last chapter's desktop pin. Reproduction: use Next to reach the EOB chapter at 320×900. Its explanatory text runs y=696–954, beyond the viewport; the selected text on desktop also lands near the bottom beside the previous chapter. The scroll target uses the padded chapter container rather than its text. The reverse journey also exposed the end-of-story stage unpinning above the Previous control. Impact: button and arrow-key users must manually repair the scroll position to read or reverse the chapter they chose. Proposed repair: use text anchors consistently, fit explanations below the pin, clamp the first destination to the story's pin boundary and give the last desktop chapter enough height to retain its controls. Evidence: `before-step-5-320.png`, `before-step-3-1440.png`, `before.json`, `return-first-before.txt`.

4. **The mobile pin can be taller than the viewport.** `app/globals.css:410`. Reproduction: open the walkthrough at 640×360 and advance once. The pinned stage is at least 380px tall; narration starts at y=370 and remains covered by the stage. Impact: landscape phones and short zoomed windows cannot read the narrative alongside the controls. Proposed repair: add a short-height layout that budgets space for the stage and narration, retaining scroll access to document content. Evidence: `before-short.png`, `probes-before.json`.

5. **FLIP animations outlive their chapter and ignore a live motion-preference change.** `components/landing/AnnotatedBill.tsx:141` and `:145`. Reproduction: rapidly fold/unfold with motion enabled, inspect the created Animation objects, then enable reduced motion before they finish. Removed rows still have running animations, surviving rows can have concurrent animations, and a probe observed 45 running handles immediately after the preference switch. Impact: rapid reversals animate stale content and reduced-motion users continue seeing already-started movement. Proposed repair: retain/cancel owned animations on effect replacement and unmount, clear stacking overrides, and subscribe to motion-preference changes so active animation and smooth scrolling stop. These animations are finite (≤560ms); this is **not evidence of an unbounded memory leak**. Evidence: `probes-before.json`, `probe-replay.txt`.

## Repair verification

Repairs are implemented in `AnnotatedBill.tsx` and `globals.css`. The frame observes size/font readiness and preserves the current chapter's text anchor during visible reflow; its camera uses native scrolling. The named statement region is keyboard/touch scrollable and inert beneath the letter. Step navigation and scroll selection share text anchors. Short windows use a 45svh stage and a scrollable letter sheet with a usable text area. FLIP handles, stacking overrides and native smooth pan are cancelled on replacement/unmount and live preference changes. No analysis, CSV, money, case-store or production letter logic changed; no dependency changes.

Current repair locations: `components/landing/AnnotatedBill.tsx:24` (reading anchor), `:31` (bounded chapter destination), `:58` (geometry/preference lifecycle), `:191` (animation cleanup), `:229` (pan), `:258` (accessible region); `app/globals.css:236` (landing focus padding), `:250` (last desktop chapter), `:290` (scroll viewport), `:443` (short windows).

`tests/redesign-browser.mjs` is integrated into both browser commands without removing existing assertions. It verifies actual evidence/narration geometry at all four widths, chapter preservation after resize and focus, keyboard access past the frame/fade, reverse navigation through the first chapter, short-screen letter editing/actions, motion-enabled reversals, live reduced-motion cancellation, unmount cleanup and runtime/console errors. Existing motion-enabled desktop and emulated-touch regressions still run.

The first implementation attempt exposed an additional reflow edge: chapter selection could change during resize before the camera updated. The full suite reproduced it, so resize now retains the chapter and aligns its text. Screenshot inspection then caught keyboard focus moving the page by the workspace's global scroll padding; landing scroll padding is now zero, with an assertion that scrolling the statement preserves the chapter. Intermediate evidence: `browser-intermediate-resize-failure.txt`, `keyboard-scroll-intermediate-failure.txt`. Test readiness was also corrected: native keyboard scrolling is awaited by evidence geometry, and media changes are allowed two rendering frames before starting an animation probe. Assertions were strengthened, not disabled. A source snapshot initially retained a `.tsx` extension and was picked up by TypeScript; renaming that artifact to `.tsx.txt` fixed the verification setup without changing compiler exclusions.

Claude repair attribution: the restricted read-only CLI request timed out after 300 seconds; a fresh request with supplied source and no tools timed out after 180 seconds. Neither returned an implementation or review. Codex made the repairs directly under the user's explicit repair instruction and verified them independently of the earlier Claude redesign. The project contract's Claude repair step was therefore **unavailable**, not passed. Results are retained in `artifacts/redesign-claude-{repair,patch}.json`.

All six required gates passed on the final repair. Browser gates ran outside the sandbox with `STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright`; axe came from the project's installed `axe-core`. No package/browser installation or default-runtime repair was performed. The sandboxed first Chromium launch was denied by macOS (`MachPortRendezvousServer ... Permission denied`); it was not counted as a pass.

| Command | Result | Current evidence under `artifacts/redesign-audit/` |
| --- | --- | --- |
| `npm run typecheck` | Passed | `typecheck.txt` |
| `npm run lint` | Passed, zero warnings | `lint.txt` |
| `npm test` | Passed, 36 tests | `tests.txt` |
| `npm run build` | Passed, production webpack build | `build.txt` |
| `npm run test:browser` | Passed with cached-runtime override | `browser.txt` |
| `npm run test:a11y` | Passed, 42 axe scans, zero WCAG 2.1 A/AA violations | `a11y.txt`, `accessibility.json` |

Final route captures and measurements are `after.json`, `after-{home,start,method,review,letter,not-a-route}-{1440,768,390,320}.png` and `after-step-{0..7}-{width}.png`. Inspected the route comparison board and focused original screenshots for the arithmetic/EOB states, folded evidence with keyboard focus, first/last chapter controls, resize, short windows, drawer focus and letter layouts. `after-questions-scrolled-{width}.png` shows the formerly unreachable EOB evidence with chapter 7 retained; `after-resize.png`, `after-short.png` and `return-first-{width}.png` show the geometry repairs. Document widths match the four requested widths. The route pass captured no page errors or off-origin requests; browser regressions additionally assert no runtime/console errors.

An immediate reduced-motion navigation screenshot briefly captured old and new page snapshots together. Frame sampling found two transition-rendering frames and no running CSS animations; the settled screenshot at 700ms was clear. It was not reported as persistent overlap. Stable final letter captures wait for the transition to settle. This does not establish that every cross-browser transition has identical timing.

React lifecycle guidance was fetched through Context7 (library resolution followed by docs), using `/reactjs/react.dev`. The official [effect cleanup](https://react.dev/reference/react/useEffect) and [layout measurement](https://react.dev/reference/react/useLayoutEffect) guidance informed observer/listener/animation ownership. No retrieval failure, quota error or offline fallback occurred for that lookup.

Final diagnostic measurements used Chromium at 1440×900 and 390×900, with 4× CPU throttling for the phone viewport. These are short local samples, not field INP or a hardware performance certification:

| Observation | Desktop | Phone, 4× CPU |
| --- | --- | --- |
| Scroll-only forward and reverse chapter sequence | All 15 states matched | All 15 states matched |
| Scroll-only layout shift / p95 frame | 0 / 16.7ms | 0 / 16.7ms |
| Scroll-only frames >50ms / long tasks | 0 / none | 0 / none |
| Button walkthrough p95 frame | 16.8ms | 16.7ms |
| Largest sampled walkthrough event duration | 40ms | 48ms |
| Largest sampled review/edit/letter event duration | 32ms | 40ms |
| Review reload layout shift | 0.007 | 0 |
| Letter reload layout shift | 0.021 | 0 |

The phone load produced one 93ms long task before the walkthrough frame sample; it is retained rather than hidden by the frame figures. Initial before-repair button probes measured 24/40ms max events and 16.8/16.7ms p95 frames. The final figures do not establish a speed improvement; the repair improves reachability and lifecycle correctness without a consequential delay in these samples. The independent before run did not measure scroll-only CLS, so no before/after natural-scroll improvement is claimed. Evidence: `performance-before.json`, `performance-after.json`, `performance-natural-scroll.json`.

## Design assessment and limits

The identity is recognizable and specific to reading a bill: machine-print codes and aligned figures, serif explanations, pencil rings around disputed amounts, a highlighter tied to evidence, double rules, and specimen hatching. The review ledger and letter carry this language through the actual task. There is no generic card-grid composition, glass treatment, stock imagery or decorative motion. The weak point is responsive scroll choreography, as the verified defects above demonstrate.

Main product workflows remain independently covered by the existing browser suite: both examples; CSV/manual entry; line corrections and marks; set-aside questions; failed analysis/retry; inclusion, editing and labeled exports; storage recovery and clearing. Source inspection found no new external requests or dependencies. Browser requests during the route/screenshot pass stayed on the app origin. Bills still go to this app's server for processing and persist unencrypted in localStorage; this is not a claim that bill processing is browser-only or that hosting logs are controlled by this code.

For a concrete product check, the emergency example opens 17 lines and six questions; changing the arithmetic line's quantity from four to five resolves that question while preserving its printed total. Marking an unrecognized service adds a question, setting one aside removes it from the letter, and edited letters survive reload and retain the fictional export banner. This supports the core understand → question → correct → draft journey. The main review and letter layouts remain legible at all requested widths; the most consequential redesign failures were in the walkthrough's responsive choreography.

Actual VoiceOver/NVDA narration, Safari/Firefox, physical touch hardware, native zoom controls, OS motion settings, OS print dialogs/printers, long-duration heap profiling, production infrastructure/privacy controls and licensed coding-reference validation remain unverified. Chromium emulation, axe and short Animation-object probes cannot establish those properties.

---

# Historical independent review before the visual redesign

Reviewed October 29, 2026 against the actual repository and locally built production server. Claude's handoff was treated as history, not verification. No commits, deployment, provisioning, credentials, global installations, new project dependencies or Forge agent execution were used.

## Scope

Read all application, component and library source, all tests, package manifests/lockfile, framework/lint/type configuration, AGENTS.md, CLAUDE.md, DESIGN.md, README.md, docs/BRIEF.md, docs/BRIEF.json and the original HANDOFF/REVIEW. Inspected the installed dependency tree, registry provenance, lifecycle-script metadata and vulnerability audit. Dependency implementation internals and generated build files are outside the source-review claim.

Used the installed Playwright guidance and React checklist. Existing journeys were run independently; new regressions were written for confirmed defects and integrated into the existing Node/Playwright/axe harness. No new framework or agent orchestration.

The document-and-margin design is coherent: serif headings, restrained semantic colors, readable figures, ruled ledger and numbered references. It needed targeted corrections, not a redesign or card grid.

## Confirmed findings and fixes

| ID / priority | Reproduction and impact | Fix / regression |
| --- | --- | --- |
| R1 / P1 | A valid 500-line bill generated a 20,509-character group finding ID; setting it aside exceeded the case schema's 400-character limit. An edited generated letter of 142,811 characters exceeded the old 20,000-character limit. Saving appeared to work, but reload rejected the entire case. More than 1,000 findings also exceeded selection-array limits. | Derive finding bounds from the bill/line-ID contract; allow 1,000,000 letter characters and enforce that limit in the editor; prune obsolete selection IDs when toggling. Unit regression round-trips all findings/exclusions and a large edited letter through JSON and CaseSchema. |
| R2 / P1 | Manual entry could add line 501, creating a bill both API and storage reject. | Disable Add at 500, explain the limit, guard the mutation. Browser regression removes a line from a 500-line bill, checks focus, adds its replacement and reloads 500 lines. |
| R3 / P1 | Change line total to `999`, then change the patient's mark: the form reset to `105.00`. Its key included the entire line. An invalid EOB value also blocked saving invisibly after switching coverage to self-pay. | Key the correction form by line identity; validate optional money only for active coverage. Render address errors and connect upload errors to their input. Browser regressions cover correction preservation and hidden invalid EOB values. |
| R4 / P1 | After an edit and failed analysis, navigating to letter still generated/exported old findings without a stale-results notice on that screen. | Show checking/error/stale state with retry; preserve edits; require current analysis for copy/download/print/rebuild. Browser printing while stale produces a warning instead of the letter. Browser regression forces 503, navigates, checks disabled exports, retries and recovers. Ignore successful responses after their request is aborted. |
| R5 / P1 | CSV amount `"12"34` became $1,234; `amount,total` silently chose one column; descriptions over 160 characters were silently truncated; only 50 skipped rows were returned and presented as the total. | Reject text after closing quotes and duplicate mapped headers; report wrong column counts and overlong descriptions; return all bounded row warnings. Unit regressions cover quoting, ambiguity, truncation and 61 skipped rows. Existing quoted/newline/Windows-1252 and inert-formula tests remain enabled. |
| R6 / P1 | `parseMoney("(-5)")` returned positive $5; `parseMoney("1 2.00")` returned $12. | Reject contradictory signs and internal whitespace. Preserve normal currency, commas, negatives and accounting formats. Shared unit regression covers upload/manual parsing. |
| R7 / P1 | Print hid UI with visibility, leaving its layout space. A sample PDF had four pages, including two blank trailing pages. | Exclude UI from print layout and render the letter in normal flow. The full sample letter now has two pages. Regression requires a short edited letter to print exactly one PDF page. |
| R8 / P1 | Sample copy/download/print lost the surrounding specimen label, making exported fictional bills look real. | Add an immutable export banner identifying synthetic hospital/account/prices and saying not to send. Applies to edited drafts too; real letters are unchanged. Downloadable CSV template rows now identify their prices as synthetic examples too. Unit and browser download/clipboard/print checks. |
| R9 / P2 | Compact actions measured 36/32px, retry could be 24px, below DESIGN's 44px target. Method overflowed from 320 to 356px; a long account number extended review to 340px; long mobile codes collided with quantity/price. The site header extended to 325px and the start-page resume notice with an unbroken provider name to 953px at 320px. | Increase standalone action/file-chooser targets; reflow mobile method rows with explicit table roles; wrap long supplied text/metadata; tighten the phone header gap; give mobile codes their own ledger row. Visual inspection also caught a letter-by-letter Start label at 320px; a non-shrinking action and narrower brand spacing now keep it on one line, with a regression assertion. Browser measurements/screenshots at 320/390/768/1440 with long names/codes/descriptions, large amounts and 500 rows. The 44px standard is a design requirement, not a claim about axe's WCAG 2.1 AA coverage. |
| R10 / P2 | Room-night detection included 018x leave-of-absence/room-holding codes and missed room code `120` when spreadsheets removed the leading zero. ED notes conflated clinician decision-making with hospital facility coding; 99284 was called moderately high instead of moderate. | Exclude 018x even when its description mentions room and board; accept three-digit room codes. Clarify ED facility/clinician and initial/follow-up hospital notes. Regression covers room/leave codes. Engine is `2026.10-2`. |
| R11 / P2 | Landing/footer claimed bills stayed in the browser although the app sends them to its server. No direct workspace action removed saved health/personal data. | Distinguish browser storage from server processing; add confirmed Clear saved bill with cancel, focus fallback and an explicit failure notice if removal is blocked. Explain access from a shared browser profile. Browser tests cover deletion/cancel/failure. |
| R12 / P2 | A delayed dialog focus-restoration callback could overwrite focus moved to the next action after closing a modal. Replacing the Add form with line details also removed its focused submit button and stranded focus outside the modal. | Supply fallback focus only if focus is stranded on the body/closed dialog; focus the close control if replacing modal content removed the focused element. Browser keyboard transition and deleted-opener checks cover the behavior. |
| R13 / P1 | While a sample request was held, upload and blank-bill actions remained enabled. Overlapping successful starts could replace a new case; a late request could also complete after navigation. | Lock all start actions during a request, cancel requests on leaving the page, and check the latest stored case before offering replacement. A delayed-route regression asserts the lock, observes request cancellation, and verifies navigation and storage stay untouched. The initial failing assertion is retained in `artifacts/review-start-race-before.txt`. |

Initial red tests are retained in `artifacts/review-before-tests.txt` (four failing regressions), with further reproductions in `review-before-ui.json`, `review-room-before.txt`, `before-stale-letter-390.png` and `before-method-320.png`. Intermediate verification failures also included reviewer test-code issues: an implicit type, typographic apostrophe matching and an explicit screen-media override during PDF generation, and relying on a network-failure event for a route-intercepted cancelled request (now checked via its abort signal plus unchanged navigation/storage). These were corrected without disabling assertions or tests. The new keyboard sequence exposed R12. Visual inspection also caught an identifier-wrapping regression introduced by a broad wrapping rule; wrapping is now limited to prose while billing codes and question references stay on one line, with a regression assertion.

## Security, privacy and product assessment

- Routes remain stateless with strict schemas, file/type checks and bounded reads: 512 KB JSON; 200 KB CSV plus multipart overhead; 500 rows, 30 columns, 500 characters per CSV cell. Stream regression lies about Content-Length and verifies cancellation when actual bytes exceed the cap. Invalid UTF-8, unknown properties, too many lines and invalid quantities are tested.
- No executable upload handling, raw HTML sinks, arbitrary URL fetches, third-party model calls, telemetry, server file writes or bill-content logging were found in application code. React renders text; export is plain text. Row warnings deliberately return bad field values to the submitting browser. Analysis errors do not reflect bill text.
- Browser connections are restricted to the app origin; fonts are vendored. Running-server checks cover CSP and API behavior. Production CSP permits inline scripts/styles for the current Next application; this is defense in depth, not an XSS-proof guarantee.
- Local storage is unencrypted, is not a backup, and is accessible to others using that browser profile. Multiple tabs remain last-write-wins; an open correction form is not a collaborative merge editor. Removal failure is explicitly reported. Hosted request/proxy logging is not governed by application source.
- No real reference prices, Medicare schedules, payer rates or claimed savings were added. Price alone never raises a finding. Comparisons use entered documents. On-screen and export specimen labels distinguish fictional values. Amounts in question can overlap and are never summed as savings.
- CMS eligibility is not determined by this prototype. Glossary notes and room-day conventions remain questions to confirm, not authoritative coding/payment decisions. This was not a full audit of every glossary entry against licensed current-year coding materials.

Dependency review: four exact runtime dependencies (Next 16.4.3, React/React DOM 19.3.0, zod 4.6.7), eight direct development dependencies, 405 locked dependency entries. All resolved artifacts use the npm registry. Only `unrs-resolver` is marked with an install script; no install scripts were executed. `npm audit --json --ignore-scripts` returned zero known advisories on this date, not a guarantee against undisclosed vulnerabilities. See `artifacts/dependency-audit.json` and `dependency-tree.json`. Package manifests and lockfile were unchanged.

## Quality gates

These are independent direct npm runs. Claude's existing `.studio/quality.json` was not overwritten or treated as evidence.

| Command | Final result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | Passed | `artifacts/review-typecheck.txt` |
| `npm run lint` | Passed, zero warnings | `artifacts/review-lint.txt` |
| `npm test` | Passed, 33 tests | `artifacts/review-tests.txt` |
| `npm run build` | Passed, webpack production build | `artifacts/review-build.txt` |
| `npm run test:browser` | Passed with installed browser-runtime override | `artifacts/review-browser-run.txt` |
| `npm run test:a11y` | Passed: 30 axe scans, zero WCAG 2.1 A/AA violations; same runtime override | `artifacts/review-a11y-run.txt` |

The first sandboxed browser attempt failed with `listen EPERM`; approved runs outside the sandbox are the verification path. The project's Playwright 1.64.1 expects missing Chromium r1248. Tests use the installed Playwright **1.64.0-alpha-1790635538000**, compatible with cached Chromium r1247. No browser was downloaded. Axe is 4.14.0. Exact overrides:

```sh
export STUDIO_PLAYWRIGHT=/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright
export STUDIO_AXE=/Users/edge/Forge/projects/forge-first-build/dashboard/node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
npm run test:a11y
npm audit --json --ignore-scripts
```

Coverage includes delayed/cancelled starts and both samples; CSV success/skipped rows/unsupported files/bad headers without case loss; blank entry; findings/evidence/disclosures/show-line focus; corrections/marks/set-aside; bill details; reload/corrupt/blocked storage; analysis failure/retry; letter inclusion/options/edit/rebuild/download/clipboard/print; clear and blocked clear; 500-row remove/replace; keyboard/Escape/focus fallback; long content; reduced motion; narrow layouts; and a 720×450 CSS viewport equivalent to 200% zoom of 1440×900. Native browser zoom controls were not exercised.

## Screenshots and artifacts

Artifacts are intentionally ignored by git. Main harness captures full-page landing/review/letter at 1440, 768 and 390px. Independent viewport captures and PDFs:

- `verified-start-390.png`, `verified-keyboard-focus-390.png`, `verified-drawer-390.png`, `verified-bill-details-390.png`.
- `verified-stale-letter-390.png`, `verified-letter-390.png`, `verified-print-390.png`, `verified-letter.pdf`, `verified-short-letter.pdf`.
- `verified-large-review-{1440,768,390,320}.png`, `verified-large-ledger-{390,320}.png`.
- `verified-home-320.png`, `verified-start-320.png`, `verified-method-320.png`, `verified-review-zoom-equivalent.png`.
- `review-stay-{1440,768,390}.png` captures the second sample. `review-browser-evidence.json`: actual document/viewport widths; `accessibility.json`: every axe scan and violations.

Final desktop, tablet and phone screenshots were visually inspected, including landing/review/letter, both sample bills, keyboard focus, drawer, bill details, stale letter, print, long identifiers and the 320px method header. The single-line identifier/header fixes were re-inspected after correction. Document/viewport widths matched at 320/390/768/1440px and in the 720×450 zoom-equivalent check. All 30 axe scans reported zero WCAG 2.1 A/AA violations. No failing checks remain in the final runs; platform and hardware limits below remain unverified. Chromium PDFs attest only to Chromium print output, not native OS print dialogs or physical printers.

Evidence shortcuts: [keyboard focus](../artifacts/verified-keyboard-focus-390.png), [320px method](../artifacts/verified-method-320.png), [second sample](../artifacts/review-stay-1440.png), [printed letter](../artifacts/verified-letter.pdf). Machine-readable results and source fingerprints: `artifacts/review-quality.json`.

## Sources checked

Required Context7 commands succeeded; no quota error or offline fallback:

```sh
npx ctx7@latest library 'Next.js' 'App Router route handlers request body validation and response cache control security headers'
npx ctx7@latest docs /vercel/next.js 'App Router route handlers POST request validation caching no-store and content security policy response headers'
```

The returned sources were official Next repository/docs material; no exact 16.4.3 index version was offered. Installed-framework behavior was checked by typecheck, build and running-server tests. Reference: [Next security headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers).

Medical distinctions were checked against [CMS dispute eligibility/window/fee](https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help/dispute-bill), [CMS revenue codes](https://bluebutton.cms.gov/fhir/CodeSystem/CLM-REV-CNTR-CD/), [ACEP facility coding](https://www.acep.org/administration/reimbursement/ed-facility-level-coding-guidelines) and [AMA published E/M changes](https://www.ama-assn.org/system/files/2023-e-m-descriptors-guidelines.pdf). No comparison prices were obtained from these sources.

## Unverified and next actions

1. VoiceOver/NVDA screen-reader session, native 200%/400% zoom, Safari, Firefox, physical phone/touch hardware, OS print dialog, physical printer and real patient documents remain unverified. Automated Chromium/axe results do not substitute for these.
2. Have a billing specialist review all glossary codes against current licensed references before wider release.
3. Before public hosting, assess HTTPS, hosting logs/retention, abuse/rate limits and privacy requirements. No regulatory-compliance attestation or public-service security certification is made here.
4. For browser checks without overrides, supply a reviewed Chromium build matching locked Playwright. No install/download was performed during this review.
