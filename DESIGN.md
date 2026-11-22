# Second Opinion: design direction

## Direction (redesign, October 31, 2026)

**One question at a time, in blue pencil.** A careful friend goes through your bill with one blue pencil, one question at a time, and writes your letter as you decide.

This direction won a four-way exploration (`design-lab/`, decision in `design-lab/DECISION.md`). It combines two concepts:
- **D, "One Question at a Time":** its structure. It scored best on phone composition, trust and connection to the product.
- **A, "Annotated Case File":** its marking system, which gives D an identity of its own. That means one blue pencil, levels drawn as shapes, and the evidence bracket.

It replaces the October 29 "annotated statement" identity: cream paper, rust pencil, tracked mono labels and an 8-chapter scroll walkthrough. That design is preserved in `artifacts/before-redesign-2026-10-31/` (source and screenshots). Taste Skill was the art-direction authority. Impeccable's craft floor and its Persuade/Operate split served for critique. The landing page persuades; the review and letter are places to work, so they are precise and quiet.

Why the change:
- The previous palette was the most generated-looking pairing available (cream ground plus a rust accent).
- Its signature, a scroll walkthrough, was the page's largest complexity.
- On a phone it put a dense statement in front of the first decision.

The new structure puts the user's actual job first: deciding, question by question, what to ask.

## The signature interaction: the question deck and the letter

`components/questions/` holds the deck. The review page and the landing page both use it.

- **QuestionDeck** shows one engine finding at a time, in engine order:
  - Previous/Next buttons and a row of numbered dots;
  - **←/→** when focus is inside the deck (not while typing);
  - focus moves to the new question's title after every move, and a polite live region announces it.
- **QuestionCard** is set in reading order:
  - the level (mark plus words), position and amount in question;
  - the title;
  - the evidence;
  - **"Why we noticed"** and **"Why it might be fine"**, side by side at equal weight;
  - **"Your letter will ask"**, the exact `ask` text, in the letter's serif.
- **Evidence** comes in two forms:
  - **Line-based findings:** the actual statement lines, cut out as a strip under the highlighter, with plain-English names. Facts are added only where they say more than the strip: line math, repeated code, room nights, outside stay.
  - **Disagreements between documents** (EOB, Good Faith Estimate, bill total): both figures, joined by a blue-pencil bracket that draws once, and the difference beneath.
- **The decisions write the existing case. There is no schema change.**
  - *Ask about this* removes the finding from `setAside` and `letter.excluded`.
  - *Set aside* adds it to `setAside`.
  - Undecided questions stay in the letter, as before.
  - A set-aside card offers *Ask about this after all*.
- **The letter beside it** (`LetterPreview`) is `composeLetter` output for the questions currently included. The paragraph for the question on the card is under the highlighter.
- **The move.** Keeping a question sends its numbered chip (`flight.ts`) from the card to its paragraph in the letter, and the paragraph sweeps in.
  - A clone flies above the page, so real layout and focus never move.
  - A flight is skipped when the target paragraph is off screen, cancelled by a live reduced-motion change, and removed on unmount.
- **A summary closes the deck.** It gives counts in words, then *Read your letter* / *Check the whole bill*.
- **On the landing page** (`components/landing/DemoDesk.tsx`), the example bill's real questions, analyzed at build time, sit in the same deck with page-local state. Choices there never touch storage.

## Review: two ways in

`app/review/ReviewClient.tsx` offers a **"One question at a time"** view (default) and a **"The whole bill"** view, set by a segmented control.
- The view lives in the URL (`?view=bill`), so it survives reload and needs no storage.
- A bill with no lines, or no questions once checked, shows the whole bill directly.
- *See it on the bill* (in a card's evidence caption) switches to the whole bill, marks the lines and focuses the first one.
- The whole bill is the previous ledger and margin, restyled, with every behaviour kept:
  - corrections, user marks, set-aside with restore;
  - "What was checked", the never-flagged note;
  - fresh-question highlights and the stale-results state.
- `CheckStatus` (the check's state, plus a failure alert with *Try again*) sits above both views.

## Typography

All faces are vendored (OFL) in `app/fonts`. No new font was added.

- **IBM Plex Sans** for the interface and all headings, weight 600, tracked tight. Sizes:
  - landing display: `clamp(44px, 5.7vw, 86px)`, −0.042em;
  - page titles: 44–60px;
  - question titles: 25–34px;
  - body: 16px/1.6.
  - Tabular figures everywhere.
- **Newsreader**, only for the reader's voice: the letter, plain-English names, and the quoted ask.
- **IBM Plex Mono**, only for the hospital's own print: statement lines, codes and statement amounts.
- There are no tracked uppercase labels and no eyebrows. Context that used to sit above a heading is now a sentence under it: bill meta, and `Dialog`'s `subtitle`.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#ECEEEC` | daylight canvas |
| `--ground-2` | `#E0E5E1` | one tone step down: the landing "desk", segmented controls, specimen band |
| `--sheet` | `#FFFFFF` | cards, the letter, the ledger |
| `--tint` | `#F5F7F5` | quiet fills inside sheets (code notes, placeholders) |
| `--ink` / `--ink-2` / `--ink-3` | `#17211D` / `#47534D` / `#5B6761` | text; the primary action is ink |
| `--pencil` | `#2349A6` | **the one hue**: level marks, numbered refs, links, focus, caret, the bracket |
| `--hl` | `#D9E4FA` | highlighter: "look here" only, never a severity |
| ok / warn / danger | `#2D6A4C`, `#6B4E00`, `#9B2C2C` on their tints | states only (saved, notices, destructive actions) |

Surfaces are separated by tone steps, not shadows. Only real overlays carry shadows: dialogs, and the phone's docked decision.

**Levels are shapes in one hue, always with their words:**
- *Numbers disagree*: a ring; the numbered ref is filled.
- *Worth asking*: a bracket; the ref has a dashed outline.
- *Ask for detail*: a dotted underline; the ref has a dotted outline.

Colour is never the signal (`LevelMark`, `LevelTag`, `QuestionRef` in `components/Tags.tsx`). Check states use a green tick for clear and a grey dash for not run.

## Composition

- Content is 1280px wide, with 40/24/16px gutters.
- Shape language is decided once:
  - cards, 22px corners;
  - fields, 12px;
  - paper (the letter, statement strips), 4px;
  - buttons, full pills.
- **Landing** (Persuade):
  1. The h1 across the full width, in two lines. Under it, the lede on the left and the actions with plain terms on the right.
  2. The example deck on a darker desk.
  3. "The biggest charge on this bill raised no question": the real largest line, verified unflagged at build time.
  4. Checks grouped by level, each shown with a real question from the example.
  5. The one ink field, "What it won't pretend to know".
  6. The three ways to start as ruled rows.
  
  Neighbouring sections never share a layout.
- **Start:** two white sheets, the examples and your bill.
- **Letter:** controls on the left, paper on the right.
- **Method:** each section is a sheet, and the level legend repeats the marks.
- **Breakpoints, three compositions:**
  - **≥1100:** deck 7/12 with the letter sticky at 5/12; ledger with a sticky margin.
  - **720–1099:** one column, the letter under the questions, the margin above the ledger.
  - **<720:**
    - **Bill head:** shrinks to the hospital name, care and visit, and the amount due in the questions view.
    - **Switch and band:** short labels, and only the first sentence of the specimen band.
    - **Ledger:** reflows into entries.
    - **Decision dock:** docks at the bottom of the screen once the question's title has reached the upper half of the screen (IntersectionObserver), so a card arriving at the bottom shows its title before its buttons.

## States

- **Empty:** review and letter offer *Open the example bill* and *Use your own bill*; the ledger shows *Add the first line*; no questions shows "No questions raised."
- **Loading:** the deck and margin hold their place with static placeholders, no shimmer. The status reads "Checking each line…" with a pulsing dot, the only loop.
- **Error:** the last results stay, dimmed and marked out of date, with *Try again* (`CheckStatus`, `.is-stale`, `.is-stale-deck`). Letter export is disabled until a fresh check.
- **Saved:** "Saved in this browser" in the workspace header, shown only while storage is healthy, refreshing softly after each change. Blocked, corrupt and clear-failed storage keep their explanatory notices.
- **Confirmation:** clear, replace and remove each use a compact dialog or confirm row. Rebuilding an edited letter asks first. Corrections confirm with "Correction saved. Checks are re-running."

## Motion

The tokens are in `app/globals.css` `:root` and unchanged from the previous system:
- **Durations:** `--t-press` 90, `--t-state` 160, `--t-reveal` 280, `--t-draw` 480, `--t-scene` 560 and `--t-lead` 200ms.
- **Easings:** ease-out to arrive, ease-in to leave, and the draw ease for pencil marks.

What moves, and only to show what changed or where it went:
- A question card arrives from 20px at reveal pace.
- The evidence bracket draws (clip-path) after the lead.
- A kept question's chip travels into the letter at scene pace, and its paragraph sweeps in.
- The current paragraph is held under the highlighter.
- Buttons settle to 0.975 on press, dots to 0.9.
- Dialogs arrive from their edge (`@starting-style`).
- Disclosures open at reveal pace where `interpolate-size` exists.
- Review ↔ letter keeps the React `<ViewTransition>` handoff, with question refs travelling. The letter beside the questions and the letter page's paper are **one shared sheet** (`components/questions/LetterSheet.tsx`):
  - it grows into place going forward and shrinks back going back, on typed navigations only;
  - its contents keep their size, anchored top-left and clipped by the moving sheet;
  - the old text fades out before the new fades in, so the two never overlap.

### Continuity rules (motion pass, October 31, 2026)

- **Direction.** A question arrives from the side you moved toward: forward from the right, back from the left (`.deck-stage[data-direction]`). A new keypress restarts the arrival, so moves never queue; the deck is never blocked.
- **The letter follows the deck.** On every question change, the current question's paragraph is scrolled into the letter's own view. Only the letter scrolls, never the page, and it waits until any chip in flight has landed (`FLIGHT_MS`).
- **Opening a finding keeps it in view.** After it opens, the sticky margin (or the page, until the margin is stuck) moves just enough to show the body, never past its title. A second pass covers the margin sticking mid-reveal.
- **The margin follows your reading.** In the whole bill, the question about the lines in the reading band (35–55% of the screen height) gets a pencil bar in the margin. This is the scroll-linked part of the annotated bill: it ties annotation to the line being read, and it is an IntersectionObserver on flagged rows only, not a scroll animation.
- **Touch.** The browser's grey tap flash is off. Every control has its own press state: buttons, the view switch, dots, step arrows, finding summaries, steps nav and ledger rows.
- **No layout shift.** The view switch reserves its question count before the first check ("–").
- **No motion library.** Motion.dev was considered and not added: every move above is CSS, the Web Animations API, an IntersectionObserver or React `<ViewTransition>`.
- **Not reintroduced: a scroll-driven walkthrough.** The chosen direction replaced the old one deliberately; it was the page's largest complexity and its only source of measured scroll layout shift. Scroll here only marks what you are reading.

`prefers-reduced-motion: reduce` removes every animation and transition, skips the flight and cancels one in progress. The letter jumps to the current paragraph, opened findings are revealed instantly, and state still changes at once. This follows the brief's acceptance criterion ("Reduced motion disables transitions"). Impeccable prefers gentler, non-spatial motion under reduced motion; that is a known divergence, kept on purpose.

## Avoided on purpose

Gradients other than the highlighter and specimen hatch, glass, glow, eyebrows, tracked caps, index numbering as decoration, icon-topped card grids, mono used as costume, sparklines, "AI-powered" language, and any number not taken from the user's documents or labelled synthetic data.

## Review checklist

- 1440, 768, 390 and 320px; the 720×450 zoom equivalent.
- Keyboard through the deck (←/→, focus on titles), the switch, ledger rows, drawer focus return and disclosures.
- Reduced motion, static and live.
- Long provider names, 500-line bills.
- Empty, loading, failed-analysis, corrupt, blocked and saved states.
- The letter's print preview.
