# Second Opinion design lab

This is an isolated design exploration. Nothing here is imported by the app, and the app was not changed.

- `index.html`: the comparison console. Switch concept, view and width over the live prototypes and see the scorecard. Open it directly (`open design-lab/index.html`); no server is needed.
- `DECISION.md`: the recommendation, scores, screenshots and implementation plan.
- `LAB-BRIEF.md`: the contract every prototype was built to.
- `a-case-file/`, `b-examination-desk/`, `c-publication/`, `d-one-question/`: the prototypes. Each holds `index.html`, `SPEC.md` (art direction) and `NOTES.md` (builder notes). Views are `#front`, `#review` and `#letter`; add `?sample=three-night-stay` for the second bill.
- `shared/`:
  - `case.js` is real engine output for the two synthetic bills. Regenerate it with `node --experimental-strip-types design-lab/shared/export-case.ts`.
  - `helpers.js` is a verified port of `lib/letter.ts`.
  - The OFL fonts are copies of the app's vendored files, plus Geist from Next.
- `shot.mjs` and `compare.mjs`: screenshot and axe harnesses using the installed Playwright and axe. Headless Chromium must run outside the macOS sandbox. Output goes to `shots/`.

Synthetic data only. There are no network requests, dependencies or credentials.
