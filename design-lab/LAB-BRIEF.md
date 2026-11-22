# Second Opinion: design lab brief

This lab is isolated from the product. Nothing outside `design-lab/` is edited. There are no installs, network requests, CDNs, credentials or real patient data.

## Product truth (read ../docs/BRIEF.md if unsure)

Someone holds an itemized hospital bill they don't understand. They are often stressed and often on a phone. Second Opinion reads the bill line by line, explains each charge in plain English, points out the specific lines worth asking about and why, and drafts a calm, editable letter to the billing office.

Never break these:
- A charge is never called wrong because it is expensive. High prices are never flagged, and no prototype may visually imply that the largest line is suspect.
- No reference prices, savings claims or "you could save $X". Amounts in question can overlap, so they are never summed into a total.
- Every finding states its level **in words**: *Numbers disagree*, *Worth asking* or *Ask for detail*. Colour is never the only signal.
- Show the innocent explanation (`finding.innocent`) with the same dignity as the reason (`finding.why`). The tone is calm, never alarmed. No "fraud" or "overcharged". The letter asks questions; it does not accuse.
- Synthetic data is labelled where it appears ("Synthetic example: fictional hospital, account and prices").
- The product reads CSV or typed-in lines. It does not read PDFs or photos. "Use your own bill" may open a short panel that says so; do not fake an upload.

## Data: use only this

- `shared/case.js` sets `window.SO`. It is generated from the **real engine** (`2026.10-2`) for two synthetic bills: `SO.cases["emergency-visit"]` (default) and `SO.cases["three-night-stay"]`. Each case has `bill` (provider, dates, `statedTotal`, `amountDue`, `eobResponsibility`, `goodFaithEstimate`, and `lineItems` with `plainName`, `codeSystem` and `codeNote`), `analysis` (`findings`, `checks`, `lineSum`, `lineCount`) and `letter`. Amounts are integer cents.
- `shared/helpers.js` sets `window.SOH`. It provides `money(cents)`, `date(iso)`, `longDate(iso)`, `refsByLine(findings)` (question numbers per line id, in engine order), `reducedMotion()`, and `composeLetter({ bill, findings, sender, options })`, a byte-exact port of the product's letter composer. The letter must be built with it from the questions the user keeps.
- Load the two scripts with `<script src="../shared/case.js"></script><script src="../shared/helpers.js"></script>`.
- Fonts: OFL files are in `shared/fonts/`: Newsreader (+ italic), IBMPlexSans, IBMPlexMono (Regular and Medium), geist-latin and geist-mono-latin. Load them with `@font-face` and relative URLs. macOS system faces (Avenir Next, Avenir Next Condensed, Charter, Iowan Old Style, New York via `ui-serif`, SF via `system-ui`, Futura, Bodoni 72) are allowed **only** where a concept spec names them, and always with a sensible fallback stack.

## Prototype contract (identical for every concept, so they compare fairly)

Build `design-lab/<concept-dir>/index.html` with its own `.css` and `.js` beside it. Use vanilla HTML, CSS and JS (no build step, React or library). It must work when opened directly from `file://`.

1. **Three views in one page**, chosen by hash: `#front` (default), `#review` and `#letter`. The views are reachable from visible navigation. `?sample=three-night-stay` switches the bill, and an in-page control switches it too.
2. **Front** is the first screen of the public page (Persuade mode). It shows what this is, the concept's signature moment built from the real example bill, and one primary action, "Open the example bill", which goes to `#review`. A second, quieter action covers "Use your own bill". The view needs more than a hero alone: include the signature explanatory moment.
3. **Review** (Operate mode) has these parts:
   - every line item, with date, code, description, quantity × unit price, amount and its plain-English name where one exists;
   - the questions (findings) in engine order, each showing its level in words, title, amount in question (if any), `why`, `innocent`, facts and `ask`;
   - **select a question → its evidence lines are visibly marked in the ledger and brought into view**, and vice versa: open a line to see its plain name, `codeNote` and the questions on it;
   - **set aside / include** each question;
   - "What was checked": all `analysis.checks` with status in words (clear, flagged, not run).
4. **Letter**: built live with `SOH.composeLetter` from the included questions. The three options (`requestItemized`, `requestHold`, `askFinancialAssistance`) and the sender name are editable. The letter text itself is editable (contenteditable or a textarea), and changing a question rebuilds it with a confirm or an undo. Copy works; download .txt is optional.
5. **Accessibility**: semantic landmarks, one `h1` per view, real buttons, visible focus, keyboard-operable everything, a 44px minimum touch target, contrast ≥ 4.5:1 for text, and `prefers-reduced-motion` honoured (state still changes, instantly). Use a `role="status"` live region for changes such as a set-aside or a letter rebuild.
6. **Responsive**: 1440, 768 and 390 px wide, with no horizontal overflow. The phone layout is its own composition, not a squeezed desktop.
7. **Performance**: transform and opacity animations (clip-path or stroke-dashoffset for drawn marks are fine), no layout thrash and no libraries. Use native View Transitions (`document.startViewTransition`) only as progressive enhancement.

## Craft floor (Taste Skill is the art-direction authority; Impeccable's craft floor applies)

- There are no eyebrows/kickers above headings, no gradient, no glass, no glow, no emoji and no icon-in-tinted-square cards. Avoid identical card grids. Avoid the "cream ground plus terracotta/rust accent" assistant palette, and use no violet or indigo.
- Monospace is allowed only for real data from the hospital's own printed document (codes, statement lines, amounts in the statement) and never as costume for labels. Avoid tiny letter-spaced uppercase labels; use sentence case at a readable size.
- Use tabular figures for every number column, right-align money, and use a fixed two decimals.
- Theme the browser surfaces: `::selection`, focus ring, caret colour, underline offset.
- Motion exists only to show what changed, where it went, or what to look at next, plus **one** authored signature moment per concept. No looping, and no scroll-jacking.
- Copy is in the product's voice: second person, short sentences, concrete numbers. Do not write "AI-powered".

## Verify before reporting

Use `node shot.mjs <concept-dir>/index.html shots/<concept>-front 1440,768,390 --full` from `design-lab/`. Add `--action "location.hash='#review'"` for the review view and `--action "location.hash='#letter'"` for the letter view; you can also pass any JS to click something first. Headless Chromium needs to run outside the sandbox (macOS mach-port restriction), so run that command with the sandbox disabled. The script prints console errors and horizontal overflow. **Open every screenshot with the Read tool and critique it.** Fix what you see, then do it again, for at most three rounds. Keyboard-test the main flow with a short Playwright script if you can.

Then write `<concept-dir>/NOTES.md` with the idea sentence, the type/colour/motion system, the signature interaction, what is simulated vs real, known weaknesses, and how it would map onto the Next app (components touched, new CSS, risk).
