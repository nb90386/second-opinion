# Second Opinion: design direction decision

October 31, 2026. This is a design-lab exploration; the production app was not changed.

**Recommendation: D, "One Question at a Time", carrying A's blue-pencil evidence language as its visual identity.** D wins on what this product is for: a stressed person, usually on a phone, deciding what to ask. A has the most memorable look and the single best moment, but its legal framing and density work against that person. A's annotation system is the part worth keeping, and it fixes D's one real weakness, a generic look.

The comparison console is `index.html` (open it from Finder or with `open design-lab/index.html`). It switches concept, view and width over live prototypes and shows the scorecard. Each concept has its art-direction `SPEC.md` and the builder's `NOTES.md`.

## What was compared, and how

The four prototypes are:
- `a-case-file/`
- `b-examination-desk/`
- `c-publication/`
- `d-one-question/`, a fourth direction invented here

They share one contract (`LAB-BRIEF.md`):
- the same two synthetic bills;
- the **real engine's findings** (`shared/case.js`, generated from `lib/analysis.ts` 2026.10-2);
- the **real letter composer**, a port verified byte for byte against `lib/letter.ts`;
- the same three views: front, review and letter.

The views carry identical required interactions:
- select a question to mark its lines;
- open a line to see its plain name and code note;
- set aside or include a question;
- rebuild the letter live, with an edit guard;
- switch between the two sample bills.

Art direction came from Taste Skill (it dealt `achromatic-ledger` for B). Impeccable's craft floor and its Persuade/Operate mode split served as critique. There is no Emil Kowalski skill installed; its motion principles (purposeful, interruptible, reduced-motion-safe) are already in the existing DESIGN.md motion language and were applied from there.

Evidence: `node compare.mjs` captured every concept × view × width (36 viewport and 36 full-page shots in `shots/compare/`) and ran axe WCAG 2.1 A/AA on each. Results are in `shots/compare/compare.json` and `run.txt`.

### Starting point: the current app

The current app is careful and coherent, but it is not memorable. Its palette (paper `#F5F3EE` + pencil `#A8361A`) is exactly the "cream ground with rust accent" that Taste Skill lists as the most generated-looking palette. Its other signatures are tracked mono labels, double rules, a large light serif headline and dotted leaders. Each is executed well, and together they read as "tasteful editorial template". The structure is the same on every screen: the whole dense ledger first, with questions in a margin. On a phone this means scrolling a statement before reaching the first decision.

## Screens

Each pair is desktop 1440 then phone 390. Every view at every width is in `shots/compare/`.

| | Front | Review | Letter |
| --- | --- | --- | --- |
| A | ![](shots/compare/a-case-file-front-1440.png) ![](shots/compare/a-case-file-front-390.png) | ![](shots/a-eob-1440.png) ![](shots/compare/a-case-file-review-390.png) | ![](shots/compare/a-case-file-letter-1440.png) |
| B | ![](shots/b-fix-1440.png) ![](shots/b-fix-390.png) | ![](shots/compare/b-examination-desk-review-1440.png) ![](shots/compare/b-examination-desk-review-390.png) | ![](shots/compare/b-examination-desk-letter-1440.png) |
| C | ![](shots/compare/c-publication-front-1440.png) ![](shots/compare/c-publication-front-390.png) | ![](shots/c-fix-1440.png) ![](shots/compare/c-publication-review-390.png) | ![](shots/compare/c-publication-letter-1440.png) |
| D | ![](shots/compare/d-one-question-front-1440.png) ![](shots/compare/d-one-question-front-390.png) | ![](shots/compare/d-one-question-review-1440.png) ![](shots/d-mid-390.png) | ![](shots/compare/d-one-question-letter-390.png) |

## Scores

Scores are 1–5. Weights favour the user's situation: craft, accessibility, mobile, trust and product connection count ×1.5; the rest count ×1. Animation volume was deliberately not scored.

| Criterion (weight) | A Case file | B Desk | C Publication | D One question |
| --- | --- | --- | --- | --- |
| Immediate recognition (1) | **5** | 3 | **5** | 3.5 |
| Brand originality (1) | 4 | 2.5 | **4.5** | 4 |
| Visual craft (1.5) | 3.5 | **4** | 3.5 | **4** |
| Accessibility (1.5) | **4** | 3.5 | **4** | 3.5 |
| Mobile composition (1.5) | 3 | 3 | 3 | **5** |
| Trustworthiness (1.5) | 3.5 | 4.5 | 4 | **5** |
| Depth of interaction (1) | **5** | 3.5 | 4 | 4.5 |
| Connection to the product (1.5) | **5** | 4 | 4.5 | **5** |
| Performance / implementation (1) | 3 | **4** | 3.5 | 4 |
| **Weighted (out of 5)** | 3.96 | 3.61 | 3.96 | **4.33** |

Measured: no horizontal overflow at any width in any concept.

Axe scans before fixes:
- 34 of 36 views had zero violations.
- B's front at 1440 had one `color-contrast` failure.
- D's review at 1440 had one `scrollable-region-focusable` failure, fixed by making its scroll regions focusable.

The fixes resolved both: in the final run (`shots/compare/run.txt`), all 36 views report zero violations and no overflow. Every view logs two console errors; both come from axe trying to fetch stylesheets over `file://`, not from the prototypes, and `shot.mjs` runs without axe show none.

Source size: about 72–100 KB unminified per concept, with no dependencies.

## Why D wins

1. **It answers the user's actual question first.** On a 390px phone, D is the only concept whose first review screen shows a question, its evidence strip, "why we noticed" and the three thumb actions. A, B and C all open on a statement header, a reconciliation chart or a four-paragraph intro.
2. **It is the most trustworthy.** "Why it might be fine" sits beside "Why we noticed" at equal weight on every card. No other concept gives the innocent explanation that much dignity, and it is the product's central promise.
3. **The interface is the product's output.** Each decision visibly builds the letter. Review and letter stop being two pages joined by a button and become one motion.
4. **It is cheaper than it looks.** It reuses the engine, `setAside`/`excluded` state, `composeLetter` and the existing ledger. Nothing in the case schema has to change.

### Why the others did not win

- **A: the Annotated Case File.** It has the best moment in the lab. Selecting the EOB question slides Exhibit B out beside the statement, and a blue bracket joins $1,890.00 to $1,250.00 ("$640.00 more"). It is also the most ownable look. But "exhibits" and "evidence" put the user in a dispute the product promises not to start. The folder chrome (boxes on manila on graphite) is busy, and the phone composition is a scaled-down desk. **Kept:** the single blue pencil, levels encoded by mark shape, and the evidence bracket.
- **C: the Publication.** It is the boldest poster, and its "Anatomy of your bill" teaches. But it is a publication: you read it rather than work in it, and the review keeps competing with its own articles. It also depends on macOS-only faces. The anatomy figure and the illustrated checks are strong candidates for the **Method** page later; they are not part of this plan.
- **B: the Examination Desk.** It is the most rigorous and the least memorable, essentially any achromatic fintech dashboard. Its signature chart undersells its own finding: at a $12,038 scale, the $640 gap is a 40px sliver. The scale strip ("the largest line raised no question") is the clearest picture of the no-price-judgement promise and could be reused once as a small figure.

## The recommended direction: "One question at a time, in blue pencil"

**Idea:** a careful friend goes through your bill with a single blue pencil, one question at a time, and writes your letter as you decide.

**Colour:**
- Daylight ground `#ECEFEC`, sheet `#FFFFFF`, ink `#17211D`, secondary `#4D5A54`.
- **One hue, blue pencil `#2349A6`,** for every annotation, the focus ring, question chips and the evidence bracket.
- The primary action is ink.
- This retires the cream and rust palette and the three tinted level pills.

**Levels by mark shape, always with words:**
- *Numbers disagree* gets a solid ring.
- *Worth asking* gets a dashed bracket.
- *Ask for detail* gets a dotted underline.

Colour is never the signal; this is A's system, and it removes three hues.

**Type, all already vendored, nothing new:**
- IBM Plex Sans for the interface. Question titles are set large: 34px on phone, 44px on desktop, weight 600, tight.
- Newsreader for the letter and the reader's notes only.
- IBM Plex Mono only inside reproduced statement lines.
- Tracked uppercase labels are removed.

**Shapes:** question cards use a 24px radius and buttons are full pills. Statement strips keep square torn edges, because they are paper.

**Motion (existing tokens):**
- Each card leaves at state pace with ease-in and arrives at reveal pace from 24px.
- A kept question's chip travels into the letter, using the existing view-transition naming pattern (FLIP fallback).
- The EOB, Good Faith Estimate and bill-total cards draw their bracket at draw pace.
- With reduced motion, everything is instant.

## Implementation plan for the Next app

These steps are ordered for risk. Each one ends green on all six gates (typecheck, lint, test, build, test:browser and test:a11y). The engine, API routes, CSV parsing and case schema are untouched.

1. **Tokens and marks** (`app/globals.css`, `components/Tags.tsx`). Replace the palette tokens with the ones above. Rebuild `.tag` as shape-encoded blue-pencil marks with the level word. Retire uppercase micro-labels. *Risk: low; all axe scans and screenshots change, so refresh baselines.*
2. **Question deck on the review page** (new `components/review/QuestionDeck.tsx`, `QuestionCard.tsx`, `EvidenceStrip.tsx`; `app/review/ReviewClient.tsx`):
   - `ReviewClient` gets a "Questions | Whole bill" switch. *Questions* is the default under 720px and the left column on desktop. *Whole bill* is today's `Ledger` + `FindingsMargin`, kept intact for advocates.
   - The card actions write existing state. *Ask about this* clears `setAside`. *Set aside* adds to `setAside`. *I'm not sure* keeps the question and offers "Mark this line as not sure", which uses the existing `unsure` mark and so the engine's "Ask for detail" rule. It invents no new semantics.
   - **Undecided questions stay included**, as they are today; the deck only records progress, held in session state, so there is no schema bump.
   - `EvidenceStrip` renders a finding's lines (or its facts for EOB, GFE and bill-total) as a torn statement strip. It includes A's bracket for the two-figure findings.
3. **Live letter column** (new `components/review/LetterTray.tsx`). On desktop this is the right column; on a phone it is a bottom sheet with "Your letter · N questions". It renders `composeLetter` from current state and reuses the letter page's edit and draft-basis guard, so a hand-edited letter is never silently rebuilt. `app/letter` stays the full editing and printing page, restyled with the new tokens.
4. **Landing** (`app/page.tsx`, `components/landing/*`). Replace the hero excerpt with the first live question card of the example bill, data from `lib/story.ts`. The 8-chapter scroll walkthrough becomes a short three-card deck you can actually try. Retiring `AnnotatedBill.tsx`'s FLIP and scroll-sync machinery removes the page's largest complexity and its remaining 0.08–0.21 scroll layout shift. Rewrite the related tests in `tests/story.test.ts` and `tests/browser.mjs` rather than delete them.
5. **Tests and docs.** Browser flows will cover:
   - keyboard-only through the deck: Enter/←/→, focus on the new card heading, and undo;
   - touch at 390;
   - the bottom sheet;
   - the letter edit guard from the tray;
   - reduced motion;
   - the 500-line bill in *Whole bill* mode.
   
   Axe runs on both review modes. Rewrite `DESIGN.md` around the new direction.

**Effort:** about 3–4 focused days for one engineer. Steps 1 and 2 are the bulk; step 4 is the most test churn.

**Main risks:**
- Advocates find the deck slow. Mitigate by remembering the chosen mode per browser and keeping the jump dots.
- The tray and the letter page diverge. Mitigate with one shared letter-state hook.
- The view-transition chip is Chromium-first; elsewhere chips appear without travel, which is acceptable.

## What was not verified

- Safari and Firefox were not tested.
- Real touch hardware and screen readers were not used.
- System-font fallbacks were not checked off macOS. This only affects the C and D prototypes; the recommendation uses vendored fonts.
- The production effort estimate is a judgement, not a measurement.
- Agent-built prototypes received fixes for the defects found in review: B's bridge hid its labels while drawing, C's review h1 ran to four lines with a button spacing bug, and D had unfocusable scroll regions. They are still exploration code, not production code.
